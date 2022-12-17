import { useEffect, useState } from "react"
import { AuthService, NotionApiToken } from "../domain/services/auth"
import { Api as RaycastApi } from "../raycast/api"
import { NewRaycastAdapter } from "../adapters/raycast/impl"
import { NewWebAdapter } from "../adapters/web/impl"
import { Api as WebApi } from "../web/api"
import { Saver } from "../core/saver"
import { Detail } from "@raycast/api"
import { ApiImpl as NotionApi } from "../notion/api"
import { NotionAdapter } from "../core/adapters"
import { SaveToPage } from "./SaveToPage"
import { LastSelectedPage, SaveToLast } from "./SaveToLast"

export enum BootstrapFlow {
    SelectCustomPage,
    SelectLastPage
}

export type BootstrapProps = {
    flow: BootstrapFlow
}

/**
 * NewApp is a constructor. It set up services and data to be ready
 * to construct the extension main pages.
 */
export default function NewApp(props: BootstrapProps) {
    const [isLoadingText, setIsLoadingText] = useState<boolean>()
    const [isLoadingOAuth, setIsLoadingOAuth] = useState<boolean>()
    const [text, setText] = useState<string>("")
    const [notionToken, setNotionToken] = useState<NotionApiToken>()
    const [isGettingLastSelectedPage, setIsGettingLastSelectedPage] = useState<boolean>()
    const [lastSelectedPage, setLastSelectedPage] = useState<LastSelectedPage>()
    const [err, setErr] = useState<Error>()

    const raycastApi = new RaycastApi()
    const raycastAdapter = NewRaycastAdapter(raycastApi)
    const webAdapter = NewWebAdapter(new WebApi())
    const authService = new AuthService(raycastAdapter, webAdapter)

    useEffect(() => {
        (async () => {
            if(notionToken) {
                console.info("notion already authorized")
                return
            }

            const toast = await raycastAdapter.showLoading("authorizing")
            setIsLoadingOAuth(true)

            const token = await authService.authorizeNotion()
            setIsLoadingOAuth(false)
            if (token instanceof Error) {
                console.error(token)
                setErr(token)
                raycastAdapter.setToastError(toast, token)
            } else {
                console.info("notion authorization successful")

                setNotionToken(token)
                raycastAdapter.setToastSuccess(toast, "")
            }
        })()
    }, [])

    // only available after Notion authorization
    let saver: Saver | undefined = undefined

    useEffect(() => {
        async function getCopiedText() {
            if(!saver) {
                return
            }

            setIsLoadingText(true)
            const toast = await raycastAdapter.showLoading("getting copied content")

            const text = await saver.getCopiedText()
            if (text instanceof Error) {
                console.error(text)
                setErr(text)
                setIsLoadingText(false)
                await raycastAdapter.setToastError(toast, text)
                return
            }

            setText(text)
            setIsLoadingText(false)
            await raycastAdapter.setToastSuccess(toast, "")
        }

        getCopiedText()
    }, [notionToken])

    useEffect(() => {
        async function doGet() {
            if(props.flow != BootstrapFlow.SelectLastPage) {
                return
            }

            const toast = await raycastAdapter.showLoading("getting last selected page")
            setIsGettingLastSelectedPage(true)

            const page = await raycastAdapter.getPersistedLastSelectedPage()
            if (page instanceof Error) {
                console.error(`${page}: save_to_last`)
                await raycastAdapter.setToastError(toast, new Error("last selected page not found"))
                setIsGettingLastSelectedPage(false)
                return
            }

            setLastSelectedPage(page)
            setIsGettingLastSelectedPage(false)
            await raycastAdapter.setToastSuccess(toast, "")
        }

        doGet()
    }, [])

    // Notes:
    // We must always declare all the `useEffect`
    // blocks everytime. If we add new blocks after
    // some conditions are satisfied then React would
    // throw error:
    // "Rendered more hooks than during the previous render."

    if (!notionToken) {
        return <Detail markdown={"Not authorized for Notion. Please try again."} />
    }
    const notionApi = new NotionApi(notionToken)
    const notionAdapter = new NotionAdapter(notionApi)
    saver = new Saver(notionAdapter, raycastAdapter, webAdapter)

    if (err) {
        return <Detail markdown={`${err}`} />
    }
    if (isLoadingText || isGettingLastSelectedPage) {
        return <Detail markdown={"Please wait...⏳"} />
    }
    if (isLoadingOAuth) {
        return <Detail markdown={"Authorizing...⏳"} />
    }

    if(props.flow === BootstrapFlow.SelectLastPage && lastSelectedPage) {
        return <SaveToLast saver={saver} copiedText={text} lastSelectedPage={lastSelectedPage} raycastAdapter={raycastAdapter}/>
    }
    return (
        <SaveToPage copiedText={text} saver={saver} setErr={setErr} raycastAdapter={raycastAdapter} />
    )
}