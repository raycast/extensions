import { Action, Icon } from "@raycast/api"
import type { CursorRule } from "../../types"
import { CursorRuleDetail } from "../CursorRuleDetail"

interface Props {
   cursorRule: CursorRule
   popularOnly: boolean
}

export const ViewRuleAction = ({ cursorRule, popularOnly }: Props) => {
   return (
      <Action.Push
         title="View Cursor Rule"
         icon={Icon.Text}
         target={
            <CursorRuleDetail
               cursorRule={cursorRule}
               popularOnly={popularOnly}
            />
         }
      />
   )
}
