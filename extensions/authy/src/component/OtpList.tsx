import {
    ActionPanel,
    CopyToClipboardAction,
    getPreferenceValues,
    Icon,
    List,
    popToRoot,
    showToast,
    ToastStyle
} from "@raycast/api"
import {useEffect, useState} from "react";
import {addToCache, APPS_KEY, DEVICE_ID, getFromCache, SECRET_SEED, SERVICES_KEY} from "../cache";
import {AuthyApp, Services} from "../client/dto";
import {decryptSeed, genTOTP} from "../util/utils";
import {encode} from "hi-base32";
import {useInterval} from "../util/hooks";
import {generateTOTP} from "../util/totp";
import {getAuthyApps, getServices} from "../client/authy-client";

interface Otp {
    name: string,
    logo: string,
    digits: number,
    seed: string,
    otp: number
}

export function OtpList(props: { isLogin: boolean | undefined, setLogin: (login: boolean) => void }) {
    const [state, setState] = useState<{ apps: Otp[], services: Otp[] }>({apps: [], services: []});
    const [serviceTimer, setServiceTimer] = useState<number>(30);
    const [appTimer, setAppTimer] = useState<number>(10);

    async function refresh(): Promise<void> {
        const toast = await showToast(ToastStyle.Animated, "Authy", "Refreshing");
        await toast.show();
        setState({apps: [], services: []});
        try {
            const {authyId} = getPreferenceValues<{ authyId: number }>();
            const deviceId: number = await getFromCache(DEVICE_ID);
            const secretSeed: string = await getFromCache(SECRET_SEED);
            // get authy apps
            const authyApp = await getAuthyApps(authyId, deviceId, genTOTP(secretSeed));
            await addToCache(APPS_KEY, authyApp)
            // get 3rd party services
            const services = await getServices(authyId, deviceId, genTOTP(secretSeed));
            await addToCache(SERVICES_KEY, services);
        } catch (error) {
            if (error instanceof Error) {
                await showToast(ToastStyle.Failure, "Authy", error.message);
                await popToRoot()
            } else {
                throw error;
            }
        }
        await loadData();
        await toast.hide();
        await showToast(ToastStyle.Success, "Authy", "Data was successful refreshed");
    }

    async function loadData(): Promise<void> {
        try {
            if (!props.isLogin) {
                return;
            }
            const servicesResponse: Services = await getFromCache(SERVICES_KEY);
            const appsResponse: AuthyApp = await getFromCache(APPS_KEY);
            const {authyPassword} = getPreferenceValues<{ authyPassword: string }>();
            const services = servicesResponse.authenticator_tokens.map(i => {
                const seed = decryptSeed(i.encrypted_seed, i.salt, authyPassword);
                return {
                    name: i.original_name ? i.original_name : i.name,
                    logo: i.logo,
                    digits: i.digits,
                    seed: seed,
                    otp: generateTOTP(seed, {digits: i.digits, period: 30})
                }
            });
            const apps = appsResponse.apps.map(i => {
                return {
                    name: i.name,
                    logo: "",
                    digits: i.digits,
                    seed: i.secret_seed,
                    otp: generateTOTP(encode(Buffer.from(i.secret_seed, "hex")), {digits: i.digits, period: 10})
                }
            });
            console.log(apps, services)
            setState({apps: apps, services: services})
        } catch (error) {
            if (error instanceof Error) {
                await showToast(ToastStyle.Failure, "Authy", error.message);
            } else {
                throw error;
            }
        }
    }

    useEffect(() => {
        loadData()
    }, [props.isLogin])

    useInterval(() => {
        if (serviceTimer <= 1) {
            const updated = state.services.map(it => {
                return {...it, otp: generateTOTP(it.seed, {digits: it.digits, period: 30})};
            });
            setState({apps: state.apps, services: updated});
            setServiceTimer(30);
        }

        if (appTimer <= 1) {
            const updated: Otp[] = state.apps.map(it => {
                return {...it, otp: generateTOTP(encode(Buffer.from(it.seed, "hex")), {digits: it.digits, period: 10})};
            });
            setState({apps: updated, services: state.services});
            setAppTimer(10)
        }
        setServiceTimer(prev => prev - 1);
        setAppTimer(prev => prev - 1);
    }, 1000);


    const isLoading = (state.apps.length == 0 && state.services.length == 0)

    return (
        <List searchBarPlaceholder="Search"
              isLoading={isLoading}>
            <List.Section title={"Services"} subtitle={`⏱ ${serviceTimer}`}>
                {getListItem(state.services, refresh)}
            </List.Section>
            <List.Section title={"Apps"} subtitle={`⏱ ${appTimer}`}>
                {getListItem(state.apps, refresh)}
            </List.Section>
        </List>
    )
}

function getListItem(items: Otp[], refresh: () => void) {
    return items.map((item, index) =>
        <List.Item key={index} title={item.name} subtitle={`${item.otp}`} actions={
            <ActionPanel>
                <CopyToClipboardAction title="Copy OTP" content={item.otp}/>
                <ActionPanel.Item title={"Sync"} icon={Icon.ArrowClockwise}
                                  shortcut={{modifiers: ["cmd"], key: "r"}}
                                  onAction={() => refresh()}/>
            </ActionPanel>
        }/>)
}