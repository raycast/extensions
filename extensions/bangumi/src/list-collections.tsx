import { withAccessToken } from "@raycast/utils"
import { CollectionSubjectList } from "@/components/lists"
import { bangumiAuth } from "@/api"

const Command = () => <CollectionSubjectList />

export default withAccessToken(bangumiAuth)(Command)
