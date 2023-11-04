import { Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSession } from "./utils/api";
import { GetSessionResponse } from "./types";

export default function GetSession(props: LaunchProps<{ arguments: Arguments.Session }>) {
    const { ip, session_id } = props.arguments;

    const [isLoading, setIsLoading] = useState(true);
    const [markdown, setMarkdown] = useState("");

    async function getFromApi() {
        setIsLoading(true);
        const response = await getSession({ip, session_id});
        if (response.error==="0") {
            const data = response as GetSessionResponse;
            setMarkdown(`Username: ${data.username}

Password: ${data.password}

User Type: ${data.usertype}`);
            await showToast(Toast.Style.Success, "SUCCESS", "Fetched Session");
        } else {
            setMarkdown(`## ERROR
            
${response.details}`);
            await showToast(Toast.Style.Failure, "ERROR", response.details as string);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <Detail isLoading={isLoading} markdown={markdown} />
}