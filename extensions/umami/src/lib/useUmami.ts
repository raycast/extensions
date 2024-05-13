import { showFailureToast, usePromise } from "@raycast/utils";
import { UmamiResponse } from "./types";

export default function useUmami<T>(fn, options: {execute: boolean} = {execute: true}) {
    const { isLoading, data, error, revalidate } = usePromise(
        async () => {
            const response: UmamiResponse<T> = await fn;
            console.log({response})
            if (!response.ok) {
                throw({
                    message: response.error,
                })
            } else {
                if ("data" in response) {
                    if (response.data && typeof response.data==="object" && "data" in response.data)
                        return response.data.data as T;
                }
                return response.data;
            }
        },
        [],
        {
            execute: options.execute,
            onData(data) {
                console.log({data});
            },
            async onError(error) {
                console.log({error})
                const { message } = error;
                await showFailureToast(message);

                // const message = error;
                
                // let primaryAction;
                // if (message.includes('Unauthorized')) {
                //     primaryAction = {
                //         title: "Open Extension Preferences",
                //         onAction() {
                //             openExtensionPreferences()
                //         },
                //     }
                // }
                // await showFailureToast(message, {
                //     primaryAction
                // })
            },
        },
    );

    return { isLoading, data, error, revalidate };
}