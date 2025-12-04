import { Detail } from "@raycast/api"

/**
 * Use this when you want to show "nothing" instead
 * of <></>, which causes React to not even re-render.
 */
export function Empty() {
    return <Detail markdown={""} />
}
