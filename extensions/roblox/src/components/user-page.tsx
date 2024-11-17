import { Action, ActionPanel, Detail, Icon } from "@raycast/api"
import { useFetch } from "@raycast/utils"
import { numberWithCommas } from "../modules/utils";
import { generateUserProfileLink } from "../modules/roblox-links";

type UserResponse = {
    description: string;
    created: string;
    isBanned: boolean;
    externalAppDisplayName: string | null;
    hasVerifiedBadge: boolean;
    id: number;
    name: string;
    displayName: string;
}

type ThumbnailResponse = {
    data: Array<{
        targetId: number;
        state: string;
        imageUrl: string;
        version: string;
    }>;
}

type FollowerCountResponse = {
    count: number;
}

type RenderUserPageProps = {
    userId: number,
    copyField: "UserID" | "Username"
}
export function UserPage({
    userId,
    copyField
}: RenderUserPageProps) {
    const {
        data: userData,
        isLoading: userDataLoading
    } = useFetch<UserResponse>(`https://users.roblox.com/v1/users/${userId}`)

    const {
        data: thumbnailData,
        isLoading: thumbnailDataLoading
    } = useFetch<ThumbnailResponse>(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=150x200&format=Png&isCircular=false`)

    const {
        data: followerCount,
        isLoading: followerCountLoading
    } = useFetch<FollowerCountResponse>(`https://friends.roblox.com/v1/users/${userId}/followers/count`)

    const isLoading = (userDataLoading || thumbnailDataLoading || followerCountLoading);

    if (userDataLoading) {
        return <Detail isLoading={isLoading} markdown={"Loading..."} />
    }

    if (!userData) {
        return <Detail markdown={"# 😔 No User Found...\nCannot find user!"} />
    }

    const {
        name: username,
        displayName,
        isBanned,
        hasVerifiedBadge,
        created
    } = userData

    let thumbnailUrl = ""
    if (thumbnailData) {
        const imgUrl = thumbnailData.data[0].imageUrl
        if (imgUrl) {
            thumbnailUrl = imgUrl
        }
    }

    const detailMarkdown = `
# 🌟 User Profile
![](${thumbnailUrl})
    `

    const creationDate = new Date(created).toLocaleDateString("en-US");
    const hasSpecialTags = (hasVerifiedBadge || isBanned);

    let copyAction
    if (copyField == "UserID") {
        copyAction = <Action.CopyToClipboard title="Copy User ID" content={userId} />
    } else if (copyField == "Username") {
        copyAction = <Action.CopyToClipboard title="Copy Username" content={username} />
    }

    const profileURL = generateUserProfileLink(userId);

    return <Detail
        isLoading={isLoading}
        markdown={detailMarkdown}
        actions={
            <ActionPanel>
                {copyAction && copyAction}
                <Action.OpenInBrowser url={profileURL} />
            </ActionPanel>
        }
        metadata={
            <Detail.Metadata>
                <Detail.Metadata.Link title="User ID" text={userId.toString()} target={profileURL} />
                <Detail.Metadata.Label title="Display Name" text={displayName} />
                <Detail.Metadata.Label title="Username" text={username} />
                <Detail.Metadata.Label title="Account Created" text={creationDate} />

                {
                    !followerCountLoading && followerCount?.count &&
                    <Detail.Metadata.Label title="Followers" text={numberWithCommas(followerCount?.count)} />
                }

                <Detail.Metadata.TagList title="Others">
                    {hasVerifiedBadge && <Detail.Metadata.TagList.Item text="Verified" color={"#0066ff"} icon={"verified.png"} />}
                    {isBanned && <Detail.Metadata.TagList.Item text="Banned" color={"#F5323C"} icon={Icon.Hammer} />}
                    {!hasSpecialTags && <Detail.Metadata.TagList.Item text="Normal" color={"#FFFFFF"} />}
                </Detail.Metadata.TagList>
            </Detail.Metadata>
        }
    />
}