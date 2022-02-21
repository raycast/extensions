import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Profile } from "@chyroc/v2ex-api";
import { invalidTokenHelper, isInvalidToken, v2exCli } from "@/api";
import { InvalidToken } from "@/components";

export default () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>();
  const [invalidToken, setInvalidToken] = useState(false);
  useEffect(() => {
    const f = async () => {
      try {
        setLoading(true);
        const res = await v2exCli.getProfile();
        setLoading(false);
        setProfile(res.profile);
        console.log(res);
      } catch (e) {
        setLoading(false);
        console.error(e);
        if (isInvalidToken(e)) {
          setInvalidToken(true);
        }
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
      }
    };
    f();
  }, []);

  if (invalidToken) {
    return <InvalidToken />;
  }

  return <Detail isLoading={loading} markdown={generateProfileMarkdown(loading, profile)} />;
};

const generateProfileMarkdown = (loading: boolean, profile?: Profile) => {
  if (loading || !profile) {
    return "Loading";
  }
  const data = [];
  data.push(`# Profile`);
  data.push("");

  data.push(`![avatar](${profile?.avatar_normal})`);

  data.push(`- username: [${profile?.username}](${profile?.website})`);
  data.push("");

  const fields = ["id", "website", "twitter", "github", "btc", "location", "tagline", "bio"];
  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (profile[field]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      data.push(`- ${field}: ${profile[field]}`);
      data.push("");
    }
  }

  return data.join("\n");
};
