import { useEffect, useState } from "react";
import {
  changeUserAccountEmail,
  changeUserTicketingEmail,
  createUser,
  deleteUser,
  getUserDomains,
  getUserUsage,
  modifyUser,
  suspendOrUnsuspendUser,
} from "./utils/api";
import { RESELLER_USERNAME } from "./utils/constants";
import {
  ChangeUserAccountEmailRequest,
  ChangeUserTicketingEmailFormValues,
  CreateUserFormValues,
  GetUserConfigResponse,
  GetUserDomainsResponse,
  GetUserUsageResponse,
  ModifyUserFormValues,
  ModifyUserRequest,
  SuccessResponse,
} from "./types";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { getTextAndIconFromVal, getTitleFromKey, isInvalidUrl } from "./utils/functions";
import CreateNewDomainComponent from "./components/CreateNewDomainComponent";
import GetSubdomainsComponent from "./components/subdomains/GetSubdomainsComponent";
import GetEmailAccountsComponent from "./components/email-accounts/GetEmailAccountsComponent";
import ErrorComponent from "./components/ErrorComponent";
import GetDatabasesComponent from "./components/databases/GetDatabasesComponent";
import { useGetResellerIPs, useGetResellerUserAccounts, useGetUserConfig, useGetUserPackages } from "./utils/hooks";
import InvalidUrlComponent from "./components/InvalidUrlComponent";

export default function GetAccounts() {
  if (isInvalidUrl()) return <InvalidUrlComponent />;

  const { isLoading, data: users, error, revalidate } = useGetResellerUserAccounts(RESELLER_USERNAME);

  async function confirmAndDeleteUser(user: string) {
    if (
      await confirmAlert({
        title: `Delete user '${user}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteUser({ confirmed: "Confirm", delete: "yes", select0: user });
      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        revalidate();
      }
    }
  }

  async function unsuspendUser(user: string) {
    const response = await suspendOrUnsuspendUser({ dounsuspend: true, select0: user });
    if (response.error === "0") {
      const data = response as SuccessResponse;
      await showToast(Toast.Style.Success, data.text, data.details);
    }
  }
  async function suspendUser(user: string) {
    const response = await suspendOrUnsuspendUser({ dosuspend: true, select0: user });
    if (response.error === "0") {
      const data = response as SuccessResponse;
      await showToast(Toast.Style.Success, data.text, data.details);
    }
  }

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search user">
      <List.Item
        title={RESELLER_USERNAME}
        icon={Icon.PersonCircle}
        accessories={[{ tag: "RESELLER_USER" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="See User Usage"
              icon={Icon.Network}
              target={<GetUserUsage user={RESELLER_USERNAME} is_reseller={true} />}
            />
            <Action.Push
              title="See User Config"
              icon={Icon.WrenchScrewdriver}
              target={<GetUserConfig user={RESELLER_USERNAME} />}
            />
            <ActionPanel.Section>
              <Action.Push
                title="Create User"
                icon={Icon.Plus}
                target={<CreateUser onUserCreated={revalidate} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {users &&
        users.map((user) => (
          <List.Item
            key={user}
            title={user}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action.Push title="See User Usage" icon={Icon.Network} target={<GetUserUsage user={user} />} />
                <Action.Push
                  title="See User Config"
                  icon={Icon.WrenchScrewdriver}
                  target={<GetUserConfig user={user} />}
                />
                <Action.Push
                  title="Change User Account Email"
                  icon={Icon.Envelope}
                  target={<ChangeUserAccountEmail user={user} />}
                />
                <Action.Push
                  title="Change User Ticketing Email"
                  icon={Icon.Message}
                  target={<ChangeUserTicketingEmail user={user} />}
                />
                <Action.Push title="See User Domains" icon={Icon.Globe} target={<GetUserDomains user={user} />} />
                <Action.Push
                  title="See User Databases"
                  icon={Icon.Coin}
                  target={<GetDatabasesComponent userToImpersonate={user} />}
                />
                <ActionPanel.Section>
                  <Action
                    title="Suspend User"
                    icon={{ source: Icon.Pause, tintColor: Color.Yellow }}
                    onAction={() => suspendUser(user)}
                  />
                  <Action
                    title="Unsuspend User"
                    icon={{ source: Icon.Play, tintColor: Color.Green }}
                    onAction={() => unsuspendUser(user)}
                  />
                  <Action
                    title="Delete User"
                    icon={Icon.DeleteDocument}
                    style={Action.Style.Destructive}
                    onAction={() => confirmAndDeleteUser(user)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create User"
                    icon={Icon.Plus}
                    target={<CreateUser onUserCreated={revalidate} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create User"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push title="Create User" icon={Icon.Plus} target={<CreateUser onUserCreated={revalidate} />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type GetUserUsageProps = {
  user: string;
  is_reseller?: boolean;
};
function GetUserUsage({ user, is_reseller = false }: GetUserUsageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [usage, setUsage] = useState<GetUserUsageResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getUserUsage(user, is_reseller);
    if (response.error === "0") {
      const data = response as GetUserUsageResponse;
      setUsage(data);

      await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Usage");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return (
    <Detail
      navigationTitle="Get User Usage"
      isLoading={isLoading}
      markdown={`## User: ${user}`}
      metadata={
        !usage ? undefined : (
          <Detail.Metadata>
            {Object.entries(usage).map(([key, val]) => {
              if (key === "error") return;
              const title = getTitleFromKey(key);
              return (
                <Detail.Metadata.Label
                  key={key}
                  title={title}
                  text={val || undefined}
                  icon={val ? undefined : Icon.Minus}
                />
              );
            })}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify({ user, ...usage })} />
        </ActionPanel>
      }
    />
  );
}

type GetUserConfigProps = {
  user: string;
};
function GetUserConfig({ user }: GetUserConfigProps) {
  const { isLoading, data: config, revalidate } = useGetUserConfig(user);

  return (
    <Detail
      navigationTitle="Get User Config"
      isLoading={isLoading}
      markdown={`## User: ${user}`}
      metadata={
        !config ? undefined : (
          <Detail.Metadata>
            {Object.entries(config).map(([key, val]) => {
              if (key === "error") return;
              const title = getTitleFromKey(key);
              if (val instanceof Array)
                return val.length ? (
                  <Detail.Metadata.TagList key={title} title={title}>
                    {val.map((item) => (
                      <Detail.Metadata.TagList.Item key={item} text={item} />
                    ))}
                  </Detail.Metadata.TagList>
                ) : (
                  <Detail.Metadata.Label key={title} title={title} icon={Icon.Minus} />
                );

              const { text, icon } = getTextAndIconFromVal(val);
              return <Detail.Metadata.Label key={key} title={title} text={text} icon={icon} />;
            })}
          </Detail.Metadata>
        )
      }
      actions={
        !config ? undefined : (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(config)} />
            <Action.Push
              title="Modify User"
              icon={Icon.Pencil}
              target={<ModifyUser user={user} currentConfig={config} onUserModified={() => revalidate?.()} />}
            />
          </ActionPanel>
        )
      }
    />
  );
}

type GetUserDomainsProps = {
  user: string;
};
function GetUserDomains({ user }: GetUserDomainsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [domains, setDomains] = useState<GetUserDomainsResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getUserDomains(user);
    if (response.error === "0") {
      const data: GetUserDomainsResponse = {};
      Object.entries(response).map(([key, val]) => {
        if (key === "error") return;
        const vals = val as string;
        const splitVals = vals.split(":");
        data[key] = {
          bandwidth_used: splitVals[0],
          bandwidth_limit: splitVals[1],
          disk_usage: splitVals[2],
          log_usage: splitVals[3],
          subdomains: splitVals[4],
          suspended: splitVals[5],
          quote: splitVals[6],
          ssl: splitVals[7],
          cgi: splitVals[8],
          php: splitVals[9],
        };
      });
      setDomains(data);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${Object.keys(data).length} Domains`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return (
    <List navigationTitle="Get User Domains" isLoading={isLoading} isShowingDetail>
      {domains &&
        Object.entries(domains).map(([domain, domainVal]) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(domainVal).map(([key, val]) => {
                      const title = getTitleFromKey(key);
                      return <List.Item.Detail.Metadata.Label key={key} title={title} text={val} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Get Subdomains"
                  icon={Icon.Globe}
                  target={<GetSubdomainsComponent domain={domain} userToImpersonate={user} />}
                />
                <Action.Push
                  title="Get Email Accounts"
                  icon={Icon.AtSymbol}
                  target={<GetEmailAccountsComponent domain={domain} userToImpersonate={user} />}
                />
                <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify({ domain, ...domainVal })} />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Domain"
                    icon={Icon.Plus}
                    target={<CreateNewDomainComponent onDomainCreated={getFromApi} userToImpersonate={user} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Domain"
                  icon={Icon.Plus}
                  target={<CreateNewDomainComponent onDomainCreated={getFromApi} userToImpersonate={user} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type CreateUserProps = {
  onUserCreated: () => void;
};
function CreateUser({ onUserCreated }: CreateUserProps) {
  const { pop } = useNavigation();

  const { isLoading, data: packages } = useGetUserPackages();
  const { isLoading: isLoadingIPs, data: resellerIPs = [] } = useGetResellerIPs();
  // const [customizePackage, setCustomizePackage] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateUserFormValues>({
    async onSubmit(values) {
      const notify = values.notify ? "yes" : "no";
      const response = await createUser({ ...values, action: "create", add: "Submit", notify });

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onUserCreated();
        pop();
      }
    },
    validation: {
      username(value) {
        if (!value) return "The item is required";
        else if (value.length < 4 || value.length > 8) return "The item must be 4-8 characters";
        else if (!value.match(/^[0-9a-z]+$/)) return "The item can only be alphanumeric";
      },
      email: FormValidation.Required,
      passwd(value) {
        if (!value) return "The item is required";
        else if (value.length < 5) return "The item must be 5+ characters";
        else if (itemProps.passwd2.value && itemProps.passwd2.value !== value) return "Passwords do not match";
      },
      passwd2(value) {
        if (!value) return "The item is required";
        else if (value.length < 5) return "The item must be 5+ characters";
        else if (itemProps.passwd.value && itemProps.passwd.value !== value) return "Passwords do not match";
      },
      domain: FormValidation.Required,
      package: FormValidation.Required,
      ip: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading || isLoadingIPs}
      navigationTitle="Create User"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Username" placeholder="new_user" {...itemProps.username} />
      <Form.TextField title="E-mail" placeholder="new_user@raycast.local" {...itemProps.email} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.passwd} />
      <Form.PasswordField title="Repeat Password" placeholder="hunter2" {...itemProps.passwd2} />
      <Form.TextField title="Domain" placeholder="raycast.local" {...itemProps.domain} />

      <Form.Dropdown title="User Package" {...itemProps.package}>
        {packages?.map((packageName) => (
          <Form.Dropdown.Item key={packageName} title={packageName} value={packageName} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="IP" {...itemProps.ip}>
        {resellerIPs.map((IP) => (
          <Form.Dropdown.Item key={IP} title={IP} value={IP} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox label="Send E-mail Notification" {...itemProps.notify} />
    </Form>
  );
}

type ModifyUserProps = {
  user: string;
  currentConfig: GetUserConfigResponse;
  onUserModified: () => void;
};
function ModifyUser({ user, currentConfig, onUserModified }: ModifyUserProps) {
  const { pop } = useNavigation();

  function validateAsNumberOrUnlimited(value: string | undefined) {
    if (value)
      if (!Number(value) && value !== "0" && value !== "unlimited") return "The item must be a number";
      else if (Number(value) < 0) return "The item must be greater than zero";
  }

  const { handleSubmit, itemProps } = useForm<ModifyUserFormValues>({
    async onSubmit(values) {
      const body = {} as { [key: string]: string | number };

      Object.entries(values).forEach(([key, val]) => {
        if (typeof val === "boolean") body[key] = val ? "ON" : "OFF";
        else if (["skin", "ns1", "ns2"].includes(key)) body[key] = val;
        else body[key] = val === "unlimited" ? 0 : Number(val);
      });

      const response = await modifyUser({ ...(body as ModifyUserRequest), action: "customize", user });

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onUserModified();
        pop();
      }
    },
    initialValues: {
      bandwidth: currentConfig.bandwidth,
      ubandwidth: currentConfig.bandwidth === "unlimited",
      quota: currentConfig.quota,
      uquota: currentConfig.quota === "unlimited",
      vdomains: currentConfig.vdomains,
      uvdomains: currentConfig.vdomains === "unlimited",
      nsubdomains: currentConfig.nsubdomains,
      unsubdomains: currentConfig.nsubdomains === "unlimited",
      nemails: currentConfig.nemails,
      unemails: currentConfig.nemails === "unlimited",
      nemailf: currentConfig.nemailf,
      unemailf: currentConfig.nemailf === "unlimited",
      nemailml: currentConfig.nemailml,
      unemailml: currentConfig.nemailml === "unlimited",
      nemailr: currentConfig.nemailr,
      unemailr: currentConfig.nemailr === "unlimited",
      mysql: currentConfig.mysql,
      umysql: currentConfig.mysql === "unlimited",
      domainptr: currentConfig.domainptr,
      udomainptr: currentConfig.domainptr === "unlimited",
      ftp: currentConfig.ftp,
      uftp: currentConfig.ftp === "unlimited",
      aftp: currentConfig.aftp,
      cgi: currentConfig.cgi,
      php: currentConfig.php === "ON" ? true : false,
      spam: currentConfig.spam === "ON" ? true : false,
      cron: currentConfig.cron,
      ssl: currentConfig.ssl === "ON" ? true : false,
      sysinfo: currentConfig.sysinfo === "ON" ? true : false,
      ssh: currentConfig.ssh === "ON" ? true : false,
      dnscontrol: currentConfig.dnscontrol,
      skin: currentConfig.skin,
      ns1: currentConfig.ns1,
      ns2: currentConfig.ns2,
    },
    validation: {
      bandwidth(value) {
        return validateAsNumberOrUnlimited(value);
      },
      quota(value) {
        return validateAsNumberOrUnlimited(value);
      },
      vdomains(value) {
        return validateAsNumberOrUnlimited(value);
      },
      nsubdomains(value) {
        return validateAsNumberOrUnlimited(value);
      },
      nemails(value) {
        return validateAsNumberOrUnlimited(value);
      },
      nemailf(value) {
        return validateAsNumberOrUnlimited(value);
      },
      nemailml(value) {
        return validateAsNumberOrUnlimited(value);
      },
      nemailr(value) {
        return validateAsNumberOrUnlimited(value);
      },
      mysql(value) {
        return validateAsNumberOrUnlimited(value);
      },
      domainptr(value) {
        return validateAsNumberOrUnlimited(value);
      },
      ftp(value) {
        return validateAsNumberOrUnlimited(value);
      },
    },
  });

  return (
    <Form
      navigationTitle="Modify User"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Bandwidth" placeholder="1024" {...itemProps.bandwidth} />
      <Form.Checkbox label="Unlimited Bandwidth" {...itemProps.ubandwidth} />
      <Form.TextField title={getTitleFromKey("quota")} placeholder="1024" {...itemProps.quota} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("quota")}`} {...itemProps.uquota} />
      <Form.TextField title={getTitleFromKey("vdomains")} placeholder="1" {...itemProps.vdomains} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("vdomains")}`} {...itemProps.uvdomains} />
      <Form.TextField title={getTitleFromKey("nsubdomains")} placeholder="0" {...itemProps.nsubdomains} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("nsubdomains")}`} {...itemProps.unsubdomains} />
      <Form.TextField title={getTitleFromKey("nemails")} placeholder="1" {...itemProps.nemails} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemails")}`} {...itemProps.unemails} />
      <Form.TextField title={getTitleFromKey("nemailf")} placeholder="0" {...itemProps.nemailf} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemailf")}`} {...itemProps.unemailf} />
      <Form.TextField title={getTitleFromKey("nemailml")} placeholder="0" {...itemProps.nemailml} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemailml")}`} {...itemProps.unemailml} />
      <Form.TextField title={getTitleFromKey("nemailr")} placeholder="0" {...itemProps.nemailr} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemailr")}`} {...itemProps.unemailr} />
      <Form.TextField title={getTitleFromKey("mysql")} placeholder="1" {...itemProps.mysql} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("mysql")}`} {...itemProps.umysql} />
      <Form.TextField title={getTitleFromKey("domainptr")} placeholder="1" {...itemProps.domainptr} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("domainptr")}`} {...itemProps.udomainptr} />
      <Form.TextField title={getTitleFromKey("ftp")} placeholder="1" {...itemProps.ftp} />
      <Form.Checkbox label={`Unlimited ${getTitleFromKey("ftp")}`} {...itemProps.uftp} />

      <Form.TextField title={getTitleFromKey("skin")} placeholder="evolution" {...itemProps.skin} />
      <Form.TextField title={getTitleFromKey("ns1")} placeholder="ns1.example.com" {...itemProps.ns1} />
      <Form.TextField title={getTitleFromKey("ns2")} placeholder="ns2.example.com" {...itemProps.ns2} />
      <Form.Separator />

      <Form.Checkbox label={getTitleFromKey("aftp")} {...itemProps.aftp} />
      <Form.Checkbox label={getTitleFromKey("cgi")} {...itemProps.cgi} />
      <Form.Checkbox label={getTitleFromKey("php")} {...itemProps.php} />
      <Form.Checkbox label={getTitleFromKey("spam")} {...itemProps.spam} />
      <Form.Checkbox label={getTitleFromKey("cron")} {...itemProps.cron} />
      <Form.Checkbox label={getTitleFromKey("ssl")} {...itemProps.ssl} />
      <Form.Checkbox label={getTitleFromKey("sysinfo")} {...itemProps.sysinfo} />
      <Form.Checkbox label={getTitleFromKey("ssh")} {...itemProps.ssh} />
      <Form.Checkbox label={getTitleFromKey("dnscontrol")} {...itemProps.dnscontrol} />
    </Form>
  );
}

type ChangeUserAccountEmailProps = {
  user: string;
};
function ChangeUserAccountEmail({ user }: ChangeUserAccountEmailProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeUserAccountEmailRequest>({
    async onSubmit(values) {
      const response = await changeUserAccountEmail({ evalue: values.evalue, email: "Save" }, user);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        pop();
      }
    },
    validation: {
      evalue: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Change User Account Email"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="User" text={user} />
      <Form.TextField
        title="New Email"
        placeholder="new_email@example.com"
        {...itemProps.evalue}
        info="This is the account email and does not modify the ticket/messaging system email"
      />
    </Form>
  );
}

type ChangeUserTicketingEmailProps = {
  user: string;
};
function ChangeUserTicketingEmail({ user }: ChangeUserTicketingEmailProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeUserTicketingEmailFormValues>({
    async onSubmit(values) {
      const { email, ON } = values;
      const response = await changeUserTicketingEmail({ email, ON: ON ? "yes" : "no" }, user);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        pop();
      }
    },
    validation: {
      email: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Change User Ticketing Email"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="User" text={user} />
      <Form.TextField
        title="New Email"
        placeholder="new_email@example.com"
        {...itemProps.email}
        info="This email address is the one that will be used when tickets or messages are sent back and forth"
      />
      <Form.Checkbox label="Notify On Each Message" {...itemProps.ON} />
    </Form>
  );
}
