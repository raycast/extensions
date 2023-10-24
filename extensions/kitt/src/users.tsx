import {Action, ActionPanel, AI, Detail, environment, Image, List} from "@raycast/api";


import {useEffect, useState} from "react";
import {SearchUserFragment} from "./graphql";
import Mask = Image.Mask;
import {sdk} from "./client";

function UserActions({user, isDetail}: { user: SearchUserFragment; isDetail?: boolean }) {
    return (
        <ActionPanel>
            {isDetail ? null : <Action.Push
                target={<UseDetail user={user}/>}
                title="View"/>}
            <Action.CopyToClipboard content={user.id} title="Copy Id"/>
            <Action.CopyToClipboard content={user?.user?.profile?.name || "-"} title="Copy Name"/>
            <Action.CopyToClipboard content={user?.user?.email || "-"} title="Copy Email"/>
            <Action.OpenInBrowser
                url={`https://ops.kittoffices.com/tenants?action=INFO&selected=${user.id}`}
                title="Open in Ops"
                icon={{source: "https://ops.kittoffices.com/favicon.ico"}}
            />
        </ActionPanel>
    )
}

function UseDetail(props: { user: SearchUserFragment }) {
    const user = props.user?.user;
    const id = props.user.id;
    const [md, setMd] = useState('');

    if (!user) return null;

    if (!user.profile) return null;

    useEffect(() => {
        if (!environment.canAccess(AI)) {
            setMd("> You need to have pro Raycast to get profile info in this panel");
            return;
        }
        AI.ask(`Given the following JSON object, give a very brief markdown formatted summary (in a short paragraph) of the user. The heading should be the name of the user, include the age of the user based on their birthday if possible: ${JSON.stringify(user)}`, {
            creativity: 'low',
        })
            .then(res => {
                setMd(res);
            })
    }, [])


    return (
        <Detail
            isLoading={md == ''}
            actions={
                <UserActions user={props.user} isDetail/>
            }
            markdown={md}
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Label title={"Id"} text={id}/>
                    <Detail.Metadata.TagList title="Attr">
                        {user.isLeadTenant ? <Detail.Metadata.TagList.Item text="Lead tenant"/> : null}
                        {user.isKitt ? null : <Detail.Metadata.TagList.Item text="Client"/>}
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.Label title="Email" text={user.email}/>
                    <Detail.Metadata.Label title="Company" text={user.company?.name}
                                           icon={{
                                               source: user.company?.whiteLabelLogo?.src || "",
                                               mask: Mask.RoundedRectangle,
                                           }}/>
                    <Detail.Metadata.Separator/>
                    {user.profile.birthday ? <Detail.Metadata.Label
                        title="Birthday"
                        text={`${user?.profile?.birthday?.day}/${user?.profile?.birthday?.month}/${user?.profile?.birthday?.year}`}
                    /> : null}
                    <Detail.Metadata.Link
                        title="Links"
                        target={`https://ops.kittoffices.com/tenants?action=INFO&selected=${id}`}
                        text={"View in ops"}
                    />
                </Detail.Metadata>
            }
        />
    )
}

export default function Command() {
    const [res, setRes] = useState<SearchUserFragment[]>([]);

    const onChange = async (text: string) => {
        sdk.searchUsers({
            email: text,
        }).then(resp => {
            if (resp.data.searchsvc_GetUsers?.users) {
                setRes(resp.data.searchsvc_GetUsers.users.filter(u => u.user?.profile?.name));
            }
        })

    }

    return (
        <List filtering={false} onSearchTextChange={onChange}>
            {res.map(r => {
                return (
                    <List.Item icon={{
                        source: r.user?.profile?.photo?.src || `https://ui-avatars.com/api/?name=${r.user?.profile?.name.replace(" ", "+")}`,
                        mask: Mask.RoundedRectangle,
                    }} actions={
                        <UserActions user={r} isDetail={false}/>
                    } subtitle={r.user?.email} title={r.user?.profile?.name || "-"} key={r.id}/>
                )
            })}
        </List>
    )
}