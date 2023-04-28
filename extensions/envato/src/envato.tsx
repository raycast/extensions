import { List, Detail, Icon, environment } from "@raycast/api";
import dateFormat from "dateformat";
import { Account } from "./accountEnvato";
import { SaleItem, PayoutItem } from "./saleItem";
import { useFetch, fullDate } from "./utils";
import fs from "fs";

/*-----------------------------------*/
/*------ INDEX
/*-----------------------------------*/
export default function Command() {
	const state = useFetch();
	
	// IF EMPTY
	if (state.errors.reason !== undefined && state.errors.empty !== true) {
		return ( <Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``} />);
	}
  
	let statementItems = [];
	let resultItems = [];
	let sales = state.sales;
	function cacheItems() {
		var cache = fs.readFileSync(`${environment.supportPath}/cache.json`, 'utf8');;
		if (sales[0]?.sold_at == undefined && cache || sales[0]?.sold_at !== cache[0]?.sold_at) {
			sales = cache as saleItem;
	 	}	
	}
	console.log(state.sales);
	

  return (
	<List isShowingDetail={state.showdetail} isLoading={Object.keys(sales).length === 0 && state.errors.reason == undefined && state.errors.empty !== true}>
			<Account state={state}/>
  			<List.Section title="Sales">
	  			{state.user.username === "" ||  state.user.username == undefined ? (
						<List.EmptyView icon={{ source: Icon.TwoArrowsClockwise }} title="Loading..." />
		  			) : (
			  			state.statement.results.map((item, index) => {
			  				if(item.type == "Payout") { statementItems.push(item); }
			  			}),
			  			resultItems = statementItems.concat(state.sales).sort((a, b) => b.date - a.sold_at),
						resultItems.map((sale, index) => {
			  				const saleDate = String(dateFormat(sale["sold_at"], "d, m, yyyy"));
							if (sale.type == "Payout" && state.errors !== []) return <PayoutItem sale={sale}/>
			  				if (saleDate == fullDate && sale.type === undefined && state.errors !== []) return <SaleItem sale={sale} key={index} todey={true} item={true} />;
			  				if (saleDate != fullDate && sale.type === undefined && state.errors !== []) return <SaleItem sale={sale} key={index} todey={false} item={true} />;
						})
		 			)}
  			</List.Section>
		</List>
  );
}
