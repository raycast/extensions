import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { PaginatedResult, Product } from "./type";

const preferences = getPreferenceValues<Preferences>();
const API_URL = preferences.mode==="production" ? "https://api.creem.io/v1/" : "https://test-api.creem.io/v1/";
const API_HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": preferences.mode==="production" ? preferences.api_key : preferences.test_api_key
}
export default function ListProducts() {
    const { isLoading, data } = useFetch(API_URL + "products/search", {
        headers: API_HEADERS,
        mapResult(result: PaginatedResult<Product>) {
            return {
                data: result.items
            }
        },
        initialData: []
    })

    return <List isLoading={isLoading}>
        {!isLoading && !data.length && <List.EmptyView actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Create Product" target={<CreateProduct />} />
        </ActionPanel>} />}
        {data.map(product => <List.Item key={product.id} icon={Icon.Layers} title={product.name} />)}
    </List>
}

function CreateProduct() {
    type FormValues = {
        name: string;
        description: string;
        billing_type: string;
        currency: string;
        price: string;
        billing_period: string;
        tax_category: string;
        tax_mode: boolean;
    }
    const { handleSubmit, itemProps, values } = useForm<FormValues>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Creating Product", values.name);
            const body = {...values, price: +values.price, tax_mode: values.tax_mode ? "inclusive" : "exclusive"};
            if (values.billing_type==="onetime") delete body.billing_period;
            await fetch(API_URL + "products", {
                method: "POST",
                headers: API_HEADERS,
                body: JSON.stringify(body)
            })
        },
        initialValues: {
            price: "0.00"
        },
        validation: {
            name: FormValidation.Required,
            description: FormValidation.Required,
            price(value) {
                if (!value) return "Price is required";
                if (!Number(value)) return "Price must be a number";
            },
        }
    })
    return <Form actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Plus} title="Create Product" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.Description title="Product Details" text="These are visible to the end user when purchasing your subscription" />
        <Form.TextField title="Name" {...itemProps.name} />
        <Form.TextArea title="Description" {...itemProps.description} info="Product descriptions displayed to your customers" />

        <Form.Separator />
        <Form.Description title="Payment Details" text="These are the pricing details that will be charged for your product" />
        <Form.Dropdown title="Billing Type" {...itemProps.billing_type}>
            <Form.Dropdown.Item title="Single payment" value="onetime" />
            <Form.Dropdown.Item title="Subscription" value="recurring" />
        </Form.Dropdown>
        <Form.Dropdown title="Currency" {...itemProps.currency}>
            <Form.Dropdown.Item title="EUR" value="EUR" />
            <Form.Dropdown.Item title="USD" value="USD" />
            <Form.Dropdown.Item title="SEK" value="SEK" />
        </Form.Dropdown>
        <Form.TextField title="Pricing" {...itemProps.price} />
        {values.billing_type==="recurring" && <Form.Dropdown title="Subscription interval" {...itemProps.billing_period}>
            <Form.Dropdown.Item title="Monthly" value="every-month" />
            <Form.Dropdown.Item title="3 Months" />
            <Form.Dropdown.Item title="6 Months" />
            <Form.Dropdown.Item title="Yearly" />
        </Form.Dropdown>}
        <Form.Dropdown title="Tax Category" {...itemProps.tax_category}>
            <Form.Dropdown.Item title="Digital goods or services" />
            <Form.Dropdown.Item title="Software as a Service (SaaS)" value="saas" />
            <Form.Dropdown.Item title="Ebooks" />
        </Form.Dropdown>
        <Form.Checkbox title="Tax Behaviour" label="Price includes tax" {...itemProps.tax_mode} />
    </Form>
}