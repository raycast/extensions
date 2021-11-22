import {useEffect, useState} from "react";
import {ActionPanel, Detail, render} from "@raycast/api"
import {APPS_KEY, checkIfCached, DEVICE_ID, removeFromCache, REQUEST_ID, SECRET_SEED, SERVICES_KEY} from "./cache";
import LoginForm from "./component/LoginForm";

export default function Authy() {
    const [isLogin, setLogin] = useState<boolean>();

    useEffect(() => {
        async function checkData() {
            console.log("useEffect")
            const services = await checkIfCached(SERVICES_KEY);
            const apps = await checkIfCached(APPS_KEY);
            console.log(services, apps)
            setLogin(services || apps);
        }

        checkData()
    }, [])

    if (isLogin == false) {
        return <LoginForm setLogin={setLogin}/>
    }

    return <Detail markdown={"list"} actions={
        <ActionPanel>
            <ActionPanel.Item title={"not"} onAction={async () => {
                await removeFromCache(REQUEST_ID);
                await removeFromCache(DEVICE_ID);
                await removeFromCache(SECRET_SEED);
                await render(<Authy/>);
            }}/>
        </ActionPanel>
    }
    />
}