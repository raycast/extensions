import { ActionPanel, getPreferenceValues, List, OpenInBrowserAction, showToast, ToastStyle, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import Envato from "envato";
import dateFormat from "dateformat";

const token = getPreferenceValues().token;
let client = new Envato.Client(token);

let date = new Date();
let day = date.getDate();
let month = date.getMonth()+1;
let year = date.getFullYear();
let fullDate = `${day}, ${month}, ${year}`;

type envatoErrors = {
	empty?: boolean,
	reason?: string,
	description?: string,
};

export default function Command() {
	const [state, setState] = useState<{sales: [], errors: envatoErrors}>( { sales: [], errors: [] as envatoErrors } );

	useEffect(() => {
		async function fetch() {
			try {
				let salesInfo = await client.private.getSales();
				let salesEmpty: any = salesInfo.length === 0 ? {empty: true} : [];
				setState((oldState) => ({
					...oldState,
					sales: salesInfo as [],
					errors: salesEmpty as envatoErrors
				}));
			 } catch (error: any) {
				 let reason = error.response.reason ?? "Error";
				 let description = error.response.error ?? "An unknown error has occurred.";
				 let out: {[key: string]: any} = {reason, description};
				 setState((oldState) => ({
					 ...oldState,
					 errors: out as envatoErrors
				 }));
				 showToast(ToastStyle.Failure, reason, description);
				 return;
			 }
		}
		fetch();
	}, []);

	if(state.errors.reason !== undefined && state.errors.empty !== true) {
		return (
			<Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``}/>
	)}
	
	function price(price: "", support: "") {
		let support_out = "";
		if (parseInt(support) != 0) {
			support_out = " ($"+ support +")";
		}
		return '$' + price + support_out;
	}
	
	function SaleItem(props: {sale: any, key: number}) {
		return (
			<List.Item
			icon={props.sale.item.previews.icon_preview.icon_url ?? "/"}
			title={String(props.sale.item.name ?? "")}
			subtitle={String(dateFormat(props.sale.sold_at, "dd.mm.yyyy")) ?? ""}
			accessoryIcon="💵"
			accessoryTitle={`${price(props.sale.amount, props.sale.support_amount)}`}
			actions={
				  <ActionPanel>
					<OpenInBrowserAction url={`${props.sale.item.url}`} />
				  </ActionPanel>
				}
		  />)
	}

	return (
		<List isLoading={state.sales.length === 0 && state.errors.reason == undefined && state.errors.empty !== true }>
			<List.Section title="Today">
				{state.sales
					.map((sale, index) => {
						let saleDate = String(dateFormat(sale['sold_at'], "dd, mm, yyyy"));
						if(saleDate == fullDate && state.errors !== [])
							return (<SaleItem sale={sale} key={index} />)
					})
				}
			</List.Section>
			<List.Section title="Sales">
				{state.sales
				.map((sale, index) => {
					let saleDate = String(dateFormat(sale['sold_at'], "dd, mm, yyyy"));
					if(saleDate != fullDate && state.errors !== [])
						return (<SaleItem sale={sale} key={index} />)
				})
				}
			</List.Section>
		</List>
	);
}