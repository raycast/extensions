import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"
import CollectionList from "@/components/CollectionList"
import { SubjectCollectionType } from "@/api/bangumi"

const Command = () => <CollectionList filterType={SubjectCollectionType.Doing} />

export default withAccessToken(bangumiAuth)(Command)
