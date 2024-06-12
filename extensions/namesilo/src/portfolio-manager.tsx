import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { API_PARAMS, API_URL } from "./lib/constants";
import { ErrorResponse, EmptySuccessResponse, Portfolio } from "./lib/types";

export default function PortfolioManager() {
    const { isLoading, data, revalidate } = useNameSilo<{portfolios: Portfolio | Portfolio[] | null}>("portfolioList");
    const portfolios = !data?.portfolios ? [] : (data.portfolios instanceof Array ? data.portfolios : [data.portfolios]);
    
    return <List isLoading={isLoading}>
        {portfolios.map(portfolio => <List.Item key={portfolio.name} title={portfolio.name} actions={<ActionPanel>
        <Action.Push title="Add Portfolio" icon={Icon.Plus} target={<AddPortfolio onPortfolioAdded={revalidate} />} />
    </ActionPanel>} />)}
    </List>
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