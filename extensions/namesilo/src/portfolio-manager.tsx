import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { API_PARAMS, API_URL } from "./lib/constants";
import { ErrorResponse, EmptySuccessResponse, Portfolio, ArrOrObjOrNull, Domain } from "./lib/types";
import { parseAsArray } from "./lib/utils/parseAsArray";

export default function PortfolioManager() {
    const { isLoading, data, revalidate } = useNameSilo<{portfolios: ArrOrObjOrNull<Portfolio>}>("portfolioList");
    const portfolios = parseAsArray<Portfolio>(data?.portfolios);
    
    return <List isLoading={isLoading} isShowingDetail>
        {portfolios.map(portfolio => <List.Item key={portfolio.name} icon={Icon.Folder} title={portfolio.name} subtitle={`${portfolio.domains?.length || 0} domains`} detail={<List.Item.Detail markdown={portfolio.domains?.join(`\n\n`) || "NO DOMAINS"} />} actions={<ActionPanel>
        <Action.Push title="Add Domains to Portfolio" icon={Icon.PlusCircle} target={<AddDomainsToPortfolio onDomainsAdded={revalidate} />} />
        <Action.Push title="Add Portfolio" icon={Icon.Plus} target={<AddPortfolio onPortfolioAdded={revalidate} />} />
    </ActionPanel>} />)}
    </List>
}

type AddDomainsToPortfolioProps = {
    onDomainsAdded: () => void;
}
function AddDomainsToPortfolio({onDomainsAdded}: AddDomainsToPortfolioProps) {
    const { pop } = useNavigation();
    const { isLoading: isFetching, data } = useNameSilo<{domains: ArrOrObjOrNull<Domain>}>("listDomains");

    type FormValues = {
        domains: string;
    }
    const { itemProps, handleSubmit, values } = useForm<FormValues>({
        onSubmit() {
            add();
        },
        validation: {
            domains: FormValidation.Required
        }
    });
    
    const { isLoading: isAdding, revalidate: add } = useFetch(API_URL + `portfolioAdd?${API_PARAMS}&` + new URLSearchParams({portfolio: values.portfolio}).toString(), {
        async onWillExecute() {
await showToast(Toast.Style.Animated, "Adding Portfolio");
        },
        mapResult(result: EmptySuccessResponse | ErrorResponse) {
            if (result.reply.detail!=="success") {
                throw new Error(result.reply.detail);
            }
            return {
                data: (result as EmptySuccessResponse).reply
            };
        },
        async onData() {
            await showToast(Toast.Style.Success, "Portfolio Added");
            onPortfolioAdded();
            pop();
        },
        execute: false
    })

    const isLoading = isFetching || isAdding;

    return <Form isLoading={isLoading} navigationTitle="Portfolio Manager / Add Domains" actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.TagPicker title="Domains" placeholder="Portfolio Name" {...itemProps.portfolio} />
    </Form>
}

type AddPortfolioProps = {
    onPortfolioAdded: () => void;
}
function AddPortfolio({onPortfolioAdded}: AddPortfolioProps) {
    const { pop } = useNavigation();
    type FormValues = {
        portfolio: string;
    }
    const { itemProps, handleSubmit, values } = useForm<FormValues>({
        onSubmit() {
            add();
        },
        validation: {
            portfolio: FormValidation.Required
        }
    });
    
    const { isLoading, revalidate: add } = useFetch(API_URL + `portfolioAdd?${API_PARAMS}&` + new URLSearchParams({portfolio: values.portfolio}).toString(), {
        async onWillExecute() {
await showToast(Toast.Style.Animated, "Adding Portfolio");
        },
        mapResult(result: EmptySuccessResponse | ErrorResponse) {
            if (result.reply.detail!=="success") {
                throw new Error(result.reply.detail);
            }
            return {
                data: (result as EmptySuccessResponse).reply
            };
        },
        async onData() {
            await showToast(Toast.Style.Success, "Portfolio Added");
            onPortfolioAdded();
            pop();
        },
        execute: false
    })

    return <Form isLoading={isLoading} navigationTitle="Portfolio Manager / Add" actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.TextField title="Portfolio" placeholder="Portfolio Name" {...itemProps.portfolio} />
    </Form>
}