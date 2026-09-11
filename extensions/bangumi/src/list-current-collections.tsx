import { withAccessToken } from "@raycast/utils"
import { CollectionSubjectList } from "@/components/lists"
import { SubjectCollectionType } from "@/shared/const"
import { bangumiAuth } from "@/api"

const Command = () => <CollectionSubjectList filterType={SubjectCollectionType.Doing} />

export default withAccessToken(bangumiAuth)(Command)
