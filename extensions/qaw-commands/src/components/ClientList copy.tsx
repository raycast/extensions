/*
	Usage:
	const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  <ClientList setSelectedClient={setSelectedClient} setIsLoading={setIsLoading}/>
*/

import { Form } from "@raycast/api";
/// <reference path="./index.d.ts" />
import * as qawolf from "../../qawolf/index.js";
import { useState, useEffect } from "react";
import { Client } from "../interfaces.js";

export default function ClientList({setSelectedClient, setIsLoading}: {setSelectedClient: any, setIsLoading: any}) {
	const [clients, setClients] = useState<Client[] | undefined>([]);
  
	useEffect(() => {
    setIsLoading(true);
    qawolf.getAllClients()
      .then((res: any) => {
        setClients(res.sort((a: {name: string}, b: {name: string}) => (a.name > b.name) ? 1 : -1));
      })
      .catch ((err: any) => console.warn(err.message))
      
    setIsLoading(false);
  }, []);

  return (
    <>
      <Form.Dropdown id="client-list" title="Select Client" defaultValue="" onChange={(clientId) => setSelectedClient(clients?.find(c => c.id == clientId))}>
          {clients?.map((client: Client, index: number) => {
            return <Form.Dropdown.Item key={index} value={client.id} title={client.name} />
          })}
			</Form.Dropdown>
    </>
  );
}
