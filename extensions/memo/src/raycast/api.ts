import { Clipboard, LocalStorage, OAuth, popToRoot, showHUD, showToast, Toast } from "@raycast/api"
import Value = LocalStorage.Value
import TokenSetOptions = OAuth.TokenSetOptions

export class Api {
    getClipboardText(): Promise<string | Error> {
        return Clipboard.readText()
            .then((text) => {
                if (!text) {
                    return ""
                }
                return text
            })
            .catch((err) => {
                return new Error(`${err}:cannot get clipboard text`)
            })
    }

    persistToLocalStorage(key: string, value: Value): Promise<null | Error> {
        return LocalStorage.setItem(key, value)
            .then(() => {
                console.info(`persisted to local storage, key=${key}`)
                return null
            })
            .catch((err) => {
                return new Error(`${err}:persist failed, key=${key}`)
            })
    }

    getFromLocalStorage(key: string): Promise<Value | Error> {
        return LocalStorage.getItem(key)
            .then((value) => {
                if (!value) {
                    return new Error(`key not found, key=${key}`)
                }
                return value
            })
            .catch((err) => {
                return new Error(`${err}:local storage get failed, key=${key}`)
            })
    }

    showHUD(msg: string): Promise<void> {
        return showHUD(msg).catch((err) => {
            console.log(`${err}:error showing HUD`)
        })
    }

    showLoadingToast(msg: string): Promise<Toast> {
        return showToast(Toast.Style.Animated, msg).catch((err) => {
            console.log(`${err}:error showing toast`)
            return err
        })
    }

    setToastSuccess(toast: any, msg: string): void {
        const t = toast as Toast
        t.style = Toast.Style.Success
        t.title = msg
    }

    setToastFailure(toast: any, msg: string): void {
        const t = toast as Toast
        t.style = Toast.Style.Failure
        t.title = msg
    }

    popToRoot(): Promise<void> {
        return popToRoot({ clearSearchBar: true })
    }

    getOAuthClient(provider: string, icon: string, desc: string): OAuth.PKCEClient {
        return new OAuth.PKCEClient({
            redirectMethod: OAuth.RedirectMethod.Web,
            providerName: provider,
            providerIcon: icon,
            description: desc,
        })
    }

    persistOAuthToken(client: OAuth.PKCEClient, token: TokenSetOptions): Promise<null | Error> {
        return client
            .setTokens(token)
            .then(() => null)
            .catch((err) => {
                console.error(err)
                return new Error(`${err}:persist oauth token`)
            })
    }

    getPersistedOAuthToken(client: OAuth.PKCEClient): Promise<OAuth.TokenSet | undefined | Error> {
        return client.getTokens().catch((err) => {
            console.error(err)
            return new Error(`${err}:get oauth token from storage`)
        })
    }
}
