import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { MessageSuccessResponse, ErrorResponse, EmptySuccessResponse, Portfolio, ArrOrObjOrNull, Domain } from "./lib/types";
import { parseAsArray } from "./lib/utils/parseAsArray";
import { useState } from "react";
import generateApiUrl from "./lib/utils/generateApiUrl";

export default function PortfolioManager() {
    const { isLoading, data, revalidate } = useNameSilo<{portfolios: ArrOrObjOrNull<Portfolio>}>("portfolioList");
    const portfolios = parseAsArray<Portfolio>(data?.portfolios);
    
    return <List isLoading={isLoading} isShowingDetail>
        {portfolios.map(portfolio => <List.Item key={portfolio.name} icon={Icon.Folder} title={portfolio.name} subtitle={`${portfolio.domains?.length || 0} domains`} detail={<List.Item.Detail markdown={portfolio.domains?.join(`\n\n`) || "NO DOMAINS"} />} actions={<ActionPanel>
        <Action.Push title="Add Domains to Portfolio" icon={Icon.PlusCircle} target={<AddDomainsToPortfolio portfolio={portfolio.name} onDomainsAdded={revalidate} />} />
        <Action.Push title="Add Portfolio" icon={Icon.Plus} target={<AddPortfolio onPortfolioAdded={revalidate} />} />
    </ActionPanel>} />)}
    </List>
}

type AddDomainsToPortfolioProps = {
    portfolio: string;
    onDomainsAdded: () => void;
}
function AddDomainsToPortfolio({portfolio, onDomainsAdded}: AddDomainsToPortfolioProps) {
    const { pop } = useNavigation();
    const [execute, setExecute] = useState(false);
    const { isLoading: isFetching, data } = useNameSilo<{domains: ArrOrObjOrNull<Domain>}>("listDomains");
    const domains = parseAsArray(data?.domains);

    type FormValues = {
        domains: string[];
    }
    const { itemProps, handleSubmit, values } = useForm<FormValues>({
        onSubmit() {
            setExecute(true);
        },
        validation: {
            domains: FormValidation.Required
        }
    });
    
    const { isLoading: isAdding } = useFetch(generateApiUrl("portfolioDomainAssociate", {portfolio, domains: values.domains}), {
        async onWillExecute() {
await showToast(Toast.Style.Animated, "Adding Domain(s) to Portfolio");
        },
        mapResult(result: MessageSuccessResponse | ErrorResponse) {
            if (result.reply.detail!=="success") {
                throw new Error(result.reply.detail);
            }
            return {
                data: (result as MessageSuccessResponse).reply
            };
        },
        async onData() {
            await showToast(Toast.Style.Success, "Domains Added");
            onDomainsAdded();
            pop();
        },
        execute
    })

    const isLoading = isFetching || isAdding;

    return <Form isLoading={isLoading} navigationTitle={`Portfolio Manager / ${portfolio} / Add Domains`} actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.Description title="Portfolio" text={portfolio} />
    <Form.TagPicker title="Domains" placeholder="Domains" {...itemProps.domains}>
        {domains.map(domain => <Form.TagPicker.Item key={domain.domain} title={domain.domain} value={domain.domain} />)}
    </Form.TagPicker>
    {!isFetching && !domains.length && <>
    <Form.Separator />
        <Form.Description title="ERORR" text="No domains available!" /></>}
    </Form>
}

type AddPortfolioProps = {
    onPortfolioAdded: () => void;
}
function AddPortfolio({onPortfolioAdded}: AddPortfolioProps) {
    const { pop } = useNavigation();
    const [execute, setExecute] = useState(false);

    type FormValues = {
        portfolio: string;
    }
    const { itemProps, handleSubmit, values } = useForm<FormValues>({
        onSubmit() {
            setExecute(true);
        },
        validation: {
            portfolio: FormValidation.Required
        }
    });
    
    const { isLoading } = useFetch(generateApiUrl("portfolioAdd", {portfolio: values.portfolio}), {
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
        execute
    })

    return <Form isLoading={isLoading} navigationTitle="Portfolio Manager / Add" actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.TextField title="Portfolio" placeholder="Portfolio Name" {...itemProps.portfolio} />
    </Form>
}