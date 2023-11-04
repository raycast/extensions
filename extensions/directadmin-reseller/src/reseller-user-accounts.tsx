import { useEffect, useState } from "react";
import { createUser, deleteUser, getResellerIPs, getResellerUserAccounts, getUserConfig, getUserDomains, getUserPackages, getUserUsage, modifyUser, suspendOrUnsuspendUser } from "./utils/api";
import { RESELLER_USERNAME, TITLES_FOR_KEYS } from "./utils/constants";
import { CreateUserFormValues, GetResellerIPsResponse, GetResellerUserAccountsResponse, GetUserConfigResponse, GetUserDomainsResponse, GetUserPackagesResponse, GetUserUsageResponse, ModifyUserFormValues, ModifyUserRequest, SuccessResponse } from "./types";
import { Action, ActionPanel, Alert, Color, Detail, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { getTitleFromKey } from "./utils/functions";

export default function GetAccounts() {
    const { push } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true);
        const response = await getResellerUserAccounts(RESELLER_USERNAME);
        if (response.error==="0") {
            const data = response as GetResellerUserAccountsResponse;
            const { list } = data;
            setUsers(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Users`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
getFromApi();
    }, [])

    async function confirmAndDeleteUser(user: string) {
        if (
            await confirmAlert({
                title: `Delete user '${user}'?`,
                message: "This action cannot be undone.",
                icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive }
            })
        ) {
            const response = await deleteUser({ confirmed: "Confirm", delete: "yes", select0: user })
            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                await getFromApi();
            }
        }
    }

    async function unsuspendUser(user: string) {
        const response = await suspendOrUnsuspendUser({ dounsuspend: 1, select0: user });
        if (response.error==="0") {
            const data = response as SuccessResponse;
            await showToast(Toast.Style.Success, data.text, data.details);
        }
    }
    async function suspendUser(user: string) {
        const response = await suspendOrUnsuspendUser({ dosuspend: 1, select0: user });
        if (response.error==="0") {
            const data = response as SuccessResponse;
            await showToast(Toast.Style.Success, data.text, data.details);
        }
    }

    return <List isLoading={isLoading}>
        {users && users.map(user => <List.Item key={user} title={user} icon={Icon.Person} actions={<ActionPanel>
            <Action title="See User Usage" icon={Icon.Network} onAction={() => push(<GetUserUsage user={user} />)} />
            <Action title="See User Config" icon={Icon.WrenchScrewdriver} onAction={() => push(<GetUserConfig user={user} />)} />
            <Action title="See User Domains" icon={Icon.Globe} onAction={() => push(<GetUserDomains user={user} />)} />
            <ActionPanel.Section>
                <Action title="Suspend User" icon={Icon.Pause} onAction={() => suspendUser(user)} />
                <Action title="Unsuspend User" icon={Icon.Play} onAction={() => unsuspendUser(user)} />
                <Action title="Delete User" icon={Icon.DeleteDocument} style={Action.Style.Destructive} onAction={() => confirmAndDeleteUser(user)} />
            </ActionPanel.Section>
            <ActionPanel.Section>
                {/* <Action title="Create User" icon={Icon.Plus} onAction={() => push(<CreateUser onUserCreated={getFromApi} />)} /> */}
                <Action.Push title="Create User" icon={Icon.Plus} target={<CreateUser onUserCreated={getFromApi} />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Create User" icon={Icon.Plus} actions={<ActionPanel>
                <Action title="Create User" icon={Icon.Plus} onAction={() => push(<CreateUser onUserCreated={getFromApi} />)} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type GetUserUsageProps = {
    user: string;
}
function GetUserUsage({ user }: GetUserUsageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [usage, setUsage] = useState<GetUserUsageResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserUsage(user);
        if (response.error==="0") {
            const data = response as GetUserUsageResponse;
            setUsage(data);

            await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Usage");
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <Detail navigationTitle="Get User Usage" isLoading={isLoading} markdown={`## User: ${user}`} metadata={!usage ? undefined : <Detail.Metadata>    
        {Object.entries(usage).map(([key, val]) => {
            const title = getTitleFromKey(key);
            return <Detail.Metadata.Label key={key} title={title} text={val || undefined} icon={val ? undefined : Icon.Minus} />
        })}
    </Detail.Metadata>} actions={<ActionPanel><Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(usage)} /></ActionPanel>} />
}

type GetUserConfigProps = {
    user: string;
}
function GetUserConfig({ user }: GetUserConfigProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<GetUserConfigResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserConfig(user);
        if (response.error==="0") {
            const data = response as GetUserConfigResponse;
            setConfig(data);
            await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Config");
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <Detail navigationTitle="Get User Config" isLoading={isLoading} markdown={`## User: ${user}`} metadata={!config ? undefined : <Detail.Metadata>
        {Object.entries(config).map(([key, val]) => {
            const title = getTitleFromKey(key);
            return <Detail.Metadata.Label key={key} title={title} text={val || undefined} icon={val ? undefined : Icon.Minus} />
        })}
    </Detail.Metadata>} actions={!config ? undefined : <ActionPanel><Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(config)} />
        <Action.Push title="Modify User" icon={Icon.Pencil} target={<ModifyUser user={user} currentConfig={config} onUserModified={getFromApi} />} />
    </ActionPanel>} />
}

type GetUserDomainsProps = {
    user: string;
}
function GetUserDomains({ user }: GetUserDomainsProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [domains, setDomains] = useState<GetUserDomainsResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserDomains(user);
        if (response.error==="0") {
            const data: GetUserDomainsResponse = {};
            Object.entries(response).map(([key, val]) => {
                if (key==="error") return;
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
                }
            })
            setDomains(data);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${Object.keys(data).length} Domains`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <List navigationTitle="Get User Domains" isLoading={isLoading} isShowingDetail>
        {domains && Object.entries(domains).map(([domain, domainVal]) => <List.Item key={domain} title={domain} icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
            {Object.entries(domainVal).map(([key, val]) => {
                const title = getTitleFromKey(key);
                return <List.Item.Detail.Metadata.Label key={key} title={title} text={val} />
            })}
        </List.Item.Detail.Metadata>} />}  actions={<ActionPanel><Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(domainVal)} /></ActionPanel>} />)}
    </List>
}

type CreateUserProps = {
    onUserCreated: () => void;
}
function CreateUser({ onUserCreated }: CreateUserProps) {
    const { pop } = useNavigation();

    const [packages, setPackages] = useState<string[]>();
    const [IPs, setIPs] = useState<string[]>();
    // const [customizePackage, setCustomizePackage] = useState(false);

    const { handleSubmit, itemProps } = useForm<CreateUserFormValues>({
        async onSubmit(values) {
            const notify = values.notify ? "yes" : "no";
            const response = await createUser({ ...values, action: "create", add: "Submit", notify });

            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                onUserCreated();
                pop();
            }
        },
        validation: {
            username(value) {
                if (!value)
                    return "The item is required";
                else if (value.length < 4 || value.length > 8)
                    return "The item must be 4-8 characters";
                else if (!value.match(/^[0-9a-z]+$/))
                    return "The item can only be alphanumeric";
            },
            email: FormValidation.Required,
            passwd(value) {
                if (!value)
                    return "The item is required";
                else if (value.length < 5)
                    return "The item must be 5+ characters";
                else if (itemProps.passwd2.value && itemProps.passwd2.value!==value)
                    return "Passwords do not match";
            },
            passwd2(value) {
                if (!value)
                    return "The item is required";
                else if (value.length < 5)
                    return "The item must be 5+ characters";
                else if (itemProps.passwd.value && itemProps.passwd.value!==value)
                    return "Passwords do not match";
            },
            domain: FormValidation.Required,
            package: FormValidation.Required,
            ip: FormValidation.Required
        },
      });

      async function getPackagesFromApi() {
        const response = await getUserPackages();
        if (response.error==="0") {
            const data = response as GetUserPackagesResponse;
            const { list } = data;
            setPackages(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Packages`);
        }
      }
      async function getIPsFromApi() {
        const response = await getResellerIPs();
        if (response.error==="0") {
            const data = response as GetResellerIPsResponse;
            const { list } = data;
            setIPs(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} IPs`);
        }
      }

      useEffect(() => {
        getPackagesFromApi();
        getIPsFromApi();
      }, [])

    return <Form navigationTitle="Create User" actions={<ActionPanel>
        <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
    </ActionPanel>}>
        <Form.TextField title="Username" {...itemProps.username} />
        <Form.TextField title="E-mail" {...itemProps.email} />
        <Form.PasswordField title="Password" {...itemProps.passwd} />
        <Form.PasswordField title="Repeat Password" {...itemProps.passwd2} />
        <Form.TextField title="Domain" {...itemProps.domain} />

        {/* <Form.Separator /> */}
        <Form.Dropdown title="User Package" {...itemProps.package}>
            {packages?.map(packageName => <Form.Dropdown.Item key={packageName} title={packageName} value={packageName} />)}
        </Form.Dropdown>
        {/* <Form.Checkbox id="customizePackage" label="Customize Package" onChange={setCustomizePackage} />
        {customizePackage && (

        )}
        <Form.Separator /> */}

        <Form.Dropdown title="IP" {...itemProps.ip}>
            {IPs?.map(IP => <Form.Dropdown.Item key={IP} title={IP} value={IP} />)}
        </Form.Dropdown>
        <Form.Checkbox label="Send E-mail Notification" {...itemProps.notify} />
    </Form>
}

type ModifyUserProps = {
    user: string;
    currentConfig: GetUserConfigResponse;
    onUserModified: () => void;
}
function ModifyUser({ user, currentConfig, onUserModified }: ModifyUserProps) {
    const { pop } = useNavigation();

    const { handleSubmit, itemProps } = useForm<ModifyUserFormValues>({
        async onSubmit(values) {
            const body = {};
            Object.entries(values).forEach(([key, val]) => {
                if (typeof val === "boolean")
                    body[key] = val ? "ON" : "OFF";
                else if (["skin", "ns1", "ns2"].includes(key))
                    body[key] = val;
                else
                    body[key] = Number(val);
            })

            const response = await modifyUser({ ...body as ModifyUserRequest, action: "customize", user });

            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                onUserModified();
                pop();
            }
        },
        initialValues: {
            bandwidth: currentConfig.bandwidth,
            quota: currentConfig.quota,
            vdomains: currentConfig.vdomains,
            nsubdomains: currentConfig.nsubdomains,
            nemails: currentConfig.nemails,
            nemailf: currentConfig.nemailf,
            nemailml: currentConfig.nemailml,
            nemailr: currentConfig.nemailr,
            mysql: currentConfig.mysql,
            domainptr: currentConfig.domainptr,
            ftp: currentConfig.ftp,
            aftp: currentConfig.aftp==="ON" ? true : false,
            cgi: currentConfig.cgi==="ON" ? true : false,
            php: currentConfig.php==="ON" ? true : false,
            spam: currentConfig.spam==="ON" ? true : false,
            cron: currentConfig.cron==="ON" ? true : false,
            ssl: currentConfig.ssl==="ON" ? true : false,
            sysinfo: currentConfig.sysinfo==="ON" ? true : false,
            ssh: currentConfig.ssh==="ON" ? true : false,
            dnscontrol: currentConfig.dnscontrol==="ON" ? true : false,
            skin: currentConfig.skin,
            ns1: currentConfig.ns1,
            ns2: currentConfig.ns2,
        },
        validation: {
            bandwidth(value) {
                if (value)
                    if (!Number(value) && value!=="0")
                        return "The item must be a number";
                    else if (Number(value) < 0)
                        return "The item must be greater than zero";
            },
            quota(value) {
                if (value)
                    if (!Number(value) && value!=="0")
                        return "The item must be a number";
                    else if (Number(value) < 0)
                        return "The item must be greater than zero";
            },
vdomains(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
nsubdomains(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
nemails(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
nemailf(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
nemailml(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
nemailr(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
mysql(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
domainptr(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
},
ftp(value) {
    if (value)
        if (!Number(value) && value!=="0")
            return "The item must be a number";
        else if (Number(value) < 0)
            return "The item must be greater than zero";
}
        },
      });

    return <Form navigationTitle="Modify User" actions={<ActionPanel>
        <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
    </ActionPanel>}>
        <Form.TextField title="Bandwidth" {...itemProps.bandwidth} />
        <Form.Checkbox label="Unlimited Bandwidth" {...itemProps.ubandwidth} />
        <Form.TextField title={getTitleFromKey("quota")} {...itemProps.quota} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("quota")}`} {...itemProps.uquota} />
        <Form.TextField title={getTitleFromKey("vdomains")} {...itemProps.vdomains} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("vdomains")}`} {...itemProps.uvdomains} />
        <Form.TextField title={getTitleFromKey("nsubdomains")} {...itemProps.nsubdomains} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("nsubdomains")}`} {...itemProps.unsubdomains} />
        <Form.TextField title={getTitleFromKey("nemails")} {...itemProps.nemails} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemails")}`} {...itemProps.unemails} />
        <Form.TextField title={getTitleFromKey("nemailf")} {...itemProps.nemailf} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemailf")}`} {...itemProps.unemailf} />
        <Form.TextField title={getTitleFromKey("nemailml")} {...itemProps.nemailml} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemailml")}`} {...itemProps.unemailml} />
        <Form.TextField title={getTitleFromKey("nemailr")} {...itemProps.nemailr} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("nemailr")}`} {...itemProps.unemailr} />
        <Form.TextField title={getTitleFromKey("mysql")} {...itemProps.mysql} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("mysql")}`} {...itemProps.umysql} />
        <Form.TextField title={getTitleFromKey("domainptr")} {...itemProps.domainptr} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("domainptr")}`} {...itemProps.udomainptr} />
        <Form.TextField title={getTitleFromKey("ftp")} {...itemProps.ftp} />
        <Form.Checkbox label={`Unlimited ${getTitleFromKey("ftp")}`} {...itemProps.uftp} />

        <Form.TextField title={getTitleFromKey("skin")} {...itemProps.skin} />
        <Form.TextField title={getTitleFromKey("ns1")} {...itemProps.ns1} />
        <Form.TextField title={getTitleFromKey("ns2")} {...itemProps.ns2} />
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
}