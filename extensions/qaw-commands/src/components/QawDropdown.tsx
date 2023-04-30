/*
	Usage:
  <QawDropdown
    fieldTitle=""
    setSelectedItem={}
    updateOn={} // optional
    setIsLoading={setIsLoading}
    qawQuery={qawolf.}
    queryVars={} // optional
  />
*/

import { Form } from "@raycast/api";
/// <reference path="./index.d.ts" />
import { useState, useEffect } from "react";
import { Client } from "../interfaces.js";

export default function Command({fieldTitle, setSelectedItem, updateOn, setIsLoading, qawQuery, queryVars}: {fieldTitle: string, setSelectedItem: any, updateOn?: any, setIsLoading: any, qawQuery: any, queryVars?: any}) {
	const [allItems, setAllItems] = useState<any[] | undefined>([]);
  
	useEffect(() => {
    // setIsLoading(true);
    
    qawQuery(queryVars)
      .then((res: any) => {
        setAllItems(res.sort((a: {name: string}, b: {name: string}) => (a.name > b.name) ? 1 : -1));
      })
      .catch ((err: any) => console.warn(err.message))
      
    // setIsLoading(false);
  }, [updateOn]);

  return (
    <Form.Dropdown
      id={fieldTitle.replace(" ", "-").toLowerCase()}
      title={fieldTitle}
      defaultValue=""
      onChange={(clientId) => setSelectedItem(allItems?.find(c => c.id == clientId))}>
        {allItems?.map((item: any, index: number) => {
          return <Form.Dropdown.Item key={index} value={item.id} title={item.name} />
        })}
    </Form.Dropdown>
  );
}
