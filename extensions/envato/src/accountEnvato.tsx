import { ActionPanel, Action, List, Detail, Icon, Color, Grid } from "@raycast/api";
import { AccountBadges } from "./badgesEnvato";
import { SaleItemDetail } from "./saleItem";
import dateFormat from "dateformat";
import { useFetch } from "./utils";
import { saleItem } from "./types";

 /*-----------------------------------*/
 /*------ INDEX ACCOUNT
 /*-----------------------------------*/
 
 export default function accountEnvato() {
	const state = useFetch();

	if (state.errors.reason !== undefined && state.errors.empty !== true) {
		return ( <Detail markdown={`# 😢 ${state.errors.reason ?? ""} \n \`\`\`\n${state.errors.description ?? ""}\n\`\`\``} />);
	}
	return <List isLoading={state.portfolio.length === 0}>
			   <Account state={state}/>
			 <List.Section title="My Portfolio">
				 { state.portfolio.matches?.map((item, index) => {
						 return <PortfolioItem item={item} key={index}/>;
					   })}
			 </List.Section>
			 </List>
 }

/*-----------------------------------*/
/*------ ACCOUNT ITEM
/*-----------------------------------*/
  
export function AccountItem(props: { infoUser: any; infoAccount: any; portfolio: any; badges: any; }) {
	return (
	<List.Item
	  icon={props.infoUser.image ?? "/"}
	  title={String(`${props.infoUser.username}` ?? "")}
	  subtitle={String(`${props.infoAccount.firstname} ${props.infoAccount.surname}`) ?? ""}
	  accessories={[
		{ text: `${props.infoUser.sales}`, icon: { source: Icon.BarChart, tintColor: Color.Green } },
		{ text: `$${props.infoAccount.balance}`, icon: { source: Icon.BankNote, tintColor: Color.Green } },
	  ]}
	  actions={
		<ActionPanel>
			<Action.Push title="Portfolio" target={<AccountPortfolio portfolio={props.portfolio} badges={props.badges}/>} />
		</ActionPanel>
	  }
	/>
  );
}

/*-----------------------------------*/
/*------ ACCOUNT
/*-----------------------------------*/

 export function Account(props: { state: any }) {
	 return <List.Section title="Account">
		   {props.state.user.username === "" ||  props.state.user.username == undefined ? (
			   <List.EmptyView
				 icon={{ source: Icon.Person }}
				 title="Username"
			   />
			 ) : (
			   <AccountItem infoUser={props.state.user} infoAccount={props.state.account} portfolio={props.state.portfolio} badges={props.state.badges}/>
			)}
	   </List.Section>
 }

/*-----------------------------------*/
/*------ PORTFOLIO ITEM
/*-----------------------------------*/
  
export function PortfolioItem(props: { item: saleItem; key: number;}) {
	const accessories = [{text: `${props.item.number_of_sales} Purchases`}, {text: `${props.item.rating?.rating} (${props.item.rating?.count})`, icon: { source: Icon.Star, tintColor: Color.Yellow }}]
	const icon = props.item.previews.icon_with_landscape_preview.icon_url ?? "/";
	const title = props.item.name ?? "/";
  
	return (
	  <List.Item
		icon={icon ?? "/"}
		title={String(title ?? "")}
		subtitle={String(dateFormat(props.item.updated_at, "dd.mm.yyyy")) ?? ""}
		accessories={accessories}
		actions={
		  <ActionPanel>
			  <Action.Push title="Details" target={<SaleItemDetail sale={props.item} todey={false}/>} />
		  </ActionPanel>
		}
	  />
	);
  }
  
 /*-----------------------------------*/
 /*------ PORTFOLIO
 /*-----------------------------------*/
 
 export function AccountPortfolio(props: { portfolio: any; badges: any;}) {
  
	return <List isLoading={props.portfolio.length === 0}>
			<AccountBadges badges={props.badges}/>
		  <List.Section title="My Portfolio">
			  { props.portfolio.matches?.map((item, index) => {
					  return <PortfolioItem item={item} key={index}/>;
					})}
		  </List.Section>
		</List>
}