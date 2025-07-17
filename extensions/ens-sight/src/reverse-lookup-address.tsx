import { ActionPanel, Action, Detail, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createEnsPublicClient } from "@ensdomains/ensjs";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { differenceInDays, formatDistanceToNow } from "date-fns";

const ENS_SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/ensdomains/ens";

const TEXT_KEYS = [
  "avatar",
  "description",
  "email",
  "url",
  "com.twitter",
  "com.github",
  "com.discord",
  "notice",
  "keywords",
  "location",
  "website",
  "header",
];

async function fetchEnsExpiry(name: string): Promise<{ formatted: string; raw: string } | null> {
  const query = `query getDomainExp($name: String!) {\n  registrations(where: { domain_: { name: $name } }, first: 1, orderBy: expiryDate, orderDirection: desc) {\n    expiryDate\n  }\n}`;
  const res = await fetch(ENS_SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { name } }),
  });
  const json = await res.json();
  const expiry = json?.data?.registrations?.[0]?.expiryDate;
  if (expiry) {
    const expiryDate = new Date(Number(expiry) * 1000);
    const now = new Date();
    const days = differenceInDays(expiryDate, now);
    let formatted: string;
    if (days > 30) {
      formatted = `in ${formatDistanceToNow(expiryDate, { addSuffix: true })}`;
    } else {
      formatted = expiryDate.toLocaleString();
      if (days <= 30 && days >= 0) {
        formatted += " (expiring soon!)";
      } else if (days < 0) {
        formatted += " (expired)";
      }
    }
    return { formatted, raw: expiryDate.toLocaleString() };
  }
  return null;
}

async function resolveEnsAvatar(avatarUri: string | null): Promise<string | null> {
  if (!avatarUri) return null;
  if (avatarUri.startsWith("http://") || avatarUri.startsWith("https://")) {
    return avatarUri;
  }
  if (avatarUri.startsWith("ipfs://")) {
    return avatarUri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  if (avatarUri.startsWith("data:")) {
    return avatarUri;
  }
  if (avatarUri.startsWith("eip155:")) {
    try {
      const match = avatarUri.match(
        /^eip155:(?<chainId>\d+)\/(erc721|erc1155):(?<contract>0x[0-9a-fA-F]{40})\/(?<tokenId>\d+)$/,
      );
      if (!match || !match.groups) return null;
      const { contract, tokenId } = match.groups;
      const url = `https://api.opensea.io/api/v2/metadata/ethereum/${contract}/${tokenId}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data && data.image_url) return data.image_url;
      if (data && data.image) return data.image;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ReverseLookupAddress }>) {
  const ethAddress = props.arguments.ethAddress;
  const [ensName, setEnsName] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string | null>>({});
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolverAddress, setResolverAddress] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<{ formatted: string; raw: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function handleLookup() {
      let toast: Toast | undefined = undefined;
      try {
        if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
          setError("Invalid Ethereum address.");
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid address",
            message: "Please enter a valid Ethereum address.",
          });
          setLoading(false);
          return;
        }
        toast = await showToast({ style: Toast.Style.Animated, title: "Looking up ENS details..." });
        const client = createEnsPublicClient({
          chain: mainnet,
          transport: http("https://eth.llamarpc.com"),
        });
        // Fix linter: cast ethAddress to `0x${string}`
        const nameResult = await client.getName({ address: ethAddress as `0x${string}` });
        let name: string | null = null;
        if (typeof nameResult === "string") {
          name = nameResult;
        } else if (
          typeof nameResult === "object" &&
          nameResult &&
          typeof (nameResult as { name?: unknown }).name === "string"
        ) {
          name = (nameResult as { name: string }).name;
        }
        if (!name) {
          setError("No ENS name found for this address.");
          if (toast) {
            toast.style = Toast.Style.Failure;
            toast.title = "No ENS name found";
            toast.message = `No ENS name is associated with this address.`;
          }
          setLoading(false);
          return;
        }
        setEnsName(name);
        const recordsResult = await client.getRecords({
          name,
          coins: ["ETH"],
          texts: TEXT_KEYS,
          contentHash: true,
        });
        const recs: Record<string, string | null> = {};
        if (recordsResult.texts) {
          for (const { key, value } of recordsResult.texts) {
            recs[key] = value ?? null;
          }
        }
        setRecords(recs);
        setResolverAddress(recordsResult.resolverAddress || null);
        setContentHash(
          recordsResult.contentHash && typeof recordsResult.contentHash === "object"
            ? recordsResult.contentHash.decoded
            : typeof recordsResult.contentHash === "string"
              ? recordsResult.contentHash
              : null,
        );
        setAvatarUrl(await resolveEnsAvatar(recs["avatar"]));
        const expiryValue = await fetchEnsExpiry(name);
        setExpiry(expiryValue);
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "ENS details found";
          toast.message = `Details for ${name} loaded successfully.`;
        }
      } catch (e: unknown) {
        setError("Failed to lookup ENS name.");
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Something went wrong";
          toast.message = `Couldn't load details for this address.`;
        }
      } finally {
        setLoading(false);
      }
    }
    handleLookup();
  }, [ethAddress]);

  if (error) {
    return <Detail isLoading={false} markdown={`**${ethAddress}**\n\n${error}`} />;
  }

  if (ensName) {
    const twitter = records["com.twitter"];
    const github = records["com.github"];
    const website = records["website"] || records["url"];
    const discord = records["com.discord"];

    let markdown = "";
    if (avatarUrl) {
      markdown += `\n<img src="${avatarUrl}" alt="avatar" width="100" height="100" />\n\n---\n`;
    } else {
      markdown += `\n<img src="https://www.gravatar.com/avatar/?d=mp" alt="avatar" width="100" height="100" />\n\n---\n`;
    }
    markdown += `# ${ensName}\n`;
    markdown += `**Address:** \`${ethAddress}\`\n\n`;
    if (contentHash) {
      markdown += `**Content Hash:** \`${contentHash}\`\n`;
    }
    if (twitter || github || website || discord) {
      markdown += "\n**Links:** ";
      if (twitter) markdown += `[🐦 Twitter](https://twitter.com/${twitter.replace(/^@/, "")}) `;
      if (github) markdown += `[💻 GitHub](https://github.com/${github.replace(/^@/, "")}) `;
      if (discord) markdown += `[💬 Discord](https://discord.com/users/${discord}) `;
      if (website) markdown += `[🌐 Website](${website}) `;
      markdown += "\n";
    }
    if (records["description"]) {
      markdown += `\n> ${records["description"]}\n`;
    }
    const secondaryKeys = TEXT_KEYS.filter(
      (key) => !["avatar", "com.twitter", "com.github", "com.discord", "website", "url", "description"].includes(key),
    );
    return (
      <Detail
        isLoading={false}
        navigationTitle={ensName}
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            {resolverAddress && <Detail.Metadata.Label title="Resolver Address" text={resolverAddress} />}
            {expiry && <Detail.Metadata.Label title="Expiry" text={expiry.formatted} />}
            {secondaryKeys.filter((key) => records[key]).length > 0 && <Detail.Metadata.Label title="Other Details" />}
            {secondaryKeys
              .filter((key) => records[key])
              .map((key) => (
                <Detail.Metadata.Label key={key} title={key} text={records[key] || "-"} />
              ))}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={ensName} title="Copy ENS Name" />
            <Action.CopyToClipboard content={ethAddress} title="Copy Address" />
            <Action.OpenInBrowser url={`https://app.ens.domains/${ensName}`} title="View on ENS" />
            {twitter && (
              <Action.OpenInBrowser
                url={`https://twitter.com/${twitter.replace(/^@/, "")}`}
                title="Open Twitter"
                icon={Icon.TwoArrowsClockwise}
              />
            )}
            {github && (
              <Action.OpenInBrowser
                url={`https://github.com/${github.replace(/^@/, "")}`}
                title="Open GitHub"
                icon={Icon.TwoArrowsClockwise}
              />
            )}
            {discord && (
              <Action.OpenInBrowser
                url={`https://discord.com/users/${discord}`}
                title="Open Discord"
                icon={Icon.TwoArrowsClockwise}
              />
            )}
            {website && <Action.OpenInBrowser url={website} title="Open Website" icon={Icon.Globe} />}
            {Object.entries(records).map(([key, value]) =>
              value &&
              !["avatar", "com.twitter", "com.github", "com.discord", "website", "url", "description"].includes(key) ? (
                <Action.CopyToClipboard key={key} content={value} title={`Copy ${key}`} />
              ) : null,
            )}
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={loading} markdown={`Looking up ENS details for **${ethAddress}**...`} />;
}
