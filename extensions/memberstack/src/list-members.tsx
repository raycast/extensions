import { getAvatarIcon, showFailureToast, useCachedPromise } from "@raycast/utils";
import memberstackAdmin from "@memberstack/admin";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { PaginatedPayload, Payload } from "@memberstack/admin/lib/types/payload";

const { secret_key } = getPreferenceValues<Preferences>();
const memberstack = memberstackAdmin.init(secret_key);

export default function ListMembers() {
    const { isLoading, data: members } = useCachedPromise(() => async (options) => {
        const res = await memberstack.members.list({
            after: options.cursor,
            limit: 20
        }) as PaginatedPayload<Payload.Transforms["Member"] & { createdAt: string; profileImage: string | null; }>;
        return {
            data: res.data,
            hasMore: res.hasMore,
            cursor: res.endCursor
        };
    }, [], {
        onError(error) {
            showFailureToast(error.message)
        },
        initialData: []
    })

    return <List isLoading={isLoading} isShowingDetail>
        {members.map(member => <List.Item key={member.id} icon={member.profileImage ?? getAvatarIcon(member.auth.email)} title={member.auth.email} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="ID" text={member.id} />
            <List.Item.Detail.Metadata.Link title="Email" text={member.auth.email} target={`mailo:${member.auth.email}`} />
            <List.Item.Detail.Metadata.Label title="Created At" text={member.createdAt} />
            <List.Item.Detail.Metadata.Label title="Verified" icon={member.verified ? Icon.Check : Icon.Xmark} />
        </List.Item.Detail.Metadata>} />} />)}
    </List>
}