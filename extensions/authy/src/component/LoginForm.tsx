import {useEffect} from "react";
import {
    checkRequestStatus,
    completeRegistration,
    getAuthyApps,
    getServices,
    requestRegistration
} from "../client/authy-client";
import {
    ActionPanel,
    Detail,
    getPreferenceValues,
    Icon,
    render,
    showToast,
    SubmitFormAction,
    ToastStyle
} from "@raycast/api";
import {
    addToCache,
    AUTHY_APPS,
    checkIfCached,
    DEVICE_ID,
    getFromCache,
    removeFromCache,
    REQUEST_ID,
    SECRET_SEED,
    SERVICES_KEY
} from "../cache";
import Authy from "../search-otp";
import {genTOTP} from "../util/utils";

async function requestLoginIfNeeded() {
    const toast = await showToast(ToastStyle.Animated, "Authy", "Waiting for Approval");
    try {
        const requestExists = await checkIfCached(REQUEST_ID);
        if (!requestExists) {
            const {authyId} = getPreferenceValues<{ authyId: number }>();
            const registration = await requestRegistration(authyId);
            await addToCache(REQUEST_ID, registration.request_id)
        }
    } catch (error) {
        if (error instanceof Error) {
            await toast.hide()
            await showToast(ToastStyle.Failure, "Authy", error.message)
        } else {
            throw error;
        }
    }

}

async function checkForApproval(setLogin: (step: boolean) => void) {
    const toast = await showToast(ToastStyle.Animated, "Checking request status");
    try {
        const {authyId} = getPreferenceValues<{ authyId: number }>();
        if (!await checkIfCached(DEVICE_ID) || !await checkIfCached(SECRET_SEED)) {
            const requestId: string = await getFromCache(REQUEST_ID);
            const registrationStatus = await checkRequestStatus(authyId, requestId);

            if (registrationStatus.status == "rejected") {
                await toast.hide();
                await showToast(ToastStyle.Failure, "Authy", "Seems like you rejected registration request");
                await removeFromCache(REQUEST_ID)
                await render(<Authy/>)
            }

            if (registrationStatus.status == "pending") {
                await toast.hide();
                await showToast(ToastStyle.Failure, "Authy", "Seems like you didn't approve registration request");
                return Promise.resolve();
            }
            const device = await completeRegistration(authyId, registrationStatus.pin);
            await addToCache(DEVICE_ID, device.device.id)
            await addToCache(SECRET_SEED, device.device.secret_seed)
        }
        const deviceId: number = await getFromCache(DEVICE_ID);
        const secretSeed: string = await getFromCache(SECRET_SEED);
        console.log(deviceId, secretSeed);
        // get authy apps
        const authyApp = await getAuthyApps(authyId, deviceId, genTOTP(secretSeed));
        await addToCache(AUTHY_APPS, authyApp)
        // get 3rd party services
        const services = await getServices(authyId, deviceId, genTOTP(secretSeed));
        await addToCache(SERVICES_KEY, services);
        setLogin(true);
        return Promise.resolve();
    } catch (error) {
        if (error instanceof Error) {
            await toast.hide()
            await showToast(ToastStyle.Failure, "Authy", error.message)
        } else {
            throw error;
        }
    }
}

async function resetRegistration() {
    await removeFromCache(REQUEST_ID);
    await removeFromCache(DEVICE_ID);
    await removeFromCache(SECRET_SEED);
    await render(<Authy/>);
}

export default function LoginForm(props: { setLogin: (step: boolean) => void }) {
    useEffect(() => {
        (
            async () => {
                await requestLoginIfNeeded();
            })();
    });

    return (
        <Detail markdown={`**Hello** _World_!`} actions={
            <ActionPanel>
                <SubmitFormAction icon={Icon.Clipboard} title="Agree" onSubmit={() => checkForApproval(props.setLogin)}/>
                <ActionPanel.Item icon={Icon.ExclamationMark} title={"Start From Scratch"} onAction={resetRegistration}/>
            </ActionPanel>
        }
        />
    );
}