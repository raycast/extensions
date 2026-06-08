import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"
import MyCollection from "@/components/MyCollection"
import { SubjectCollectionType } from "@/const"

const Command = () => <MyCollection filterType={SubjectCollectionType.Doing} />

export default withAccessToken(bangumiAuth)(Command)
