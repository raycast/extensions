import NewApp, { BootstrapFlow } from "./components/NewApp"

export default function Command() {
    return <NewApp flow={BootstrapFlow.SelectLastPage} />
}
