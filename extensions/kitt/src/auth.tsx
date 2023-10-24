import {Detail} from "@raycast/api";
import {getPreferences} from "./prefs";


export default function Command() {
    const prefs = getPreferences();
    return (
        <Detail markdown={prefs.authToken}/>
    )
}