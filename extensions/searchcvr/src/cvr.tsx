import { Form, ActionPanel, Action, useNavigation, Detail, List } from "@raycast/api";
import { useEffect, useState, ReactNode } from "react";
const fetchCvrData = require("./fetchCvrData");
const helpers = require("./helpers");

export interface Props {
  query: string;
}

function ShowResults(props: Props) {
  const cvr = props.query;

  const [data, setData] = useState({ vat: "", name: "", city: "", startdate: "", employees: "", industrydesc: "", companydesc: "" });
  const [graphLink, setGraphLink] = useState("");
  const [proffLink, setProffLink] = useState(`https://proff.dk/branches%C3%B8g?q=${cvr}`);

  useEffect(() => {
    async function fetchData() {
      const fetchedData = await fetchCvrData.searchVirk(cvr);
      if (fetchedData.status == 200) {
        const companyData = await helpers.returnCompanyData(fetchedData.data);
        setData( { vat: cvr, name: companyData.name, city: companyData.city, startdate: companyData.startdate, employees: companyData.employees, industrydesc: companyData.industrydesc, companydesc: companyData.companydesc } );
      } else {
        setData({ vat: cvr, name: "Virksomhed findes ikke", city: "---", startdate: "---", employees: "---", industrydesc: "---", companydesc: "---"  });
      }

      const accountingData = await fetchCvrData.accountingVirk(cvr);

      if (accountingData.status == 200) {
        let linksXML = await helpers.returnAccountingData(accountingData.data);
        let yearlyData = await helpers.returnXMLdata(linksXML);
        let graphData = await helpers.returnGraphLink(yearlyData);
        setGraphLink(graphData);
      }

      const proffLink = await helpers.returnProffLink(cvr);
      if (proffLink != null) {
        setProffLink( proffLink );
      }
    }
    fetchData();
  }, []);

  const markdown = `
  **${data['name']}**, cvr: ${data['vat']}
  ***
  ![](${graphLink})
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={data['name']}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Start date" text={data['startdate']} />
          <Detail.Metadata.Label title="City" text={data['city']} />
          <Detail.Metadata.Label title="Employees" text={data['employees']} />
          <Detail.Metadata.Label title="Industry" text={data['industrydesc']} />
          <Detail.Metadata.Label title="Type" text={data['companydesc']} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="See company on Proff" url={proffLink} />
        </ActionPanel>
      }
    />
  );
}

function ShowSearchResults(props: Props) {
  const { push } = useNavigation();
  const name = props.query;
  const [results, setResults] = useState<ReactNode[]>([]);

  useEffect(() => {
    async function fetchData() {
      const results = await helpers.returnTopProffResults(name);
      const formattedResults = results.map((result: any) => (
        <List.Item
          key={result.cvr+20*Math.random()}
          title={result.name}
          actions={
            <ActionPanel>
              <Action
                title="Choose"
                onAction={() => {
                  push(<ShowResults query={result.cvr} />);
                }}
              />
            </ActionPanel>
          }
        />
      ));
      setResults(formattedResults);
    }
    fetchData();
  }, []);

  return (
    <List filtering={true} navigationTitle={"Search"}>
      {results}
    </List>
  );
}

function CommandWrapper() {
  const { push } = useNavigation();

  return (
    <Command onSubmit={(values) => {
      if (values.query.length === 8 && !isNaN(Number(values.query))) {
        push(<ShowResults query={values.query} />);
      } else {
        push(<ShowSearchResults query={values.query} />);
      }
    }} />
  );
}

function Command(props: { onSubmit: (values: { query: string }) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get results" onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Search"
        placeholder="Enter name or cvr..."  
        />
    </Form>
  );
}

export default CommandWrapper;