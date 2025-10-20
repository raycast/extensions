import { Action, ActionPanel, Color, Form, Icon, Image, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { makeRequest } from "./sevalla";
import { Database } from "./types";
import OpenInSevalla from "./open-in-sevalla";

const DATABASE_ICONS: Record<string,Image.ImageLike> = {
  ready: {source: Icon.CheckCircle, tintColor: Color.Green},
}
export default function Command() {
  const {isLoading,data:databases}= useCachedPromise(async() => {
    const result = await makeRequest<{company: {databases: {items: Database[]}}}>("databases");
    return result.company.databases.items;
  },[], {
    initialData: []
  })
  return <List isLoading={isLoading}>
    {!isLoading && !databases.length ? <List.EmptyView title="Create your first database" description="As soon as you create your first database, it will show up here in a list." actions={<ActionPanel>
      <Action.Push title="Create a Database" target={<CreateDatabase />} />
    </ActionPanel>} /> : databases.map(database => <List.Item key={database.id} icon={DATABASE_ICONS[database.status] || Icon.QuestionMark} title={database.display_name} subtitle={Object.keys(DATABASE_TYPES).find(type => type.toLowerCase()===database.type)} accessories={[
      {text: DATABASE_RESOURCE_TYPES[database.resource_type_name][0].split(" / ").at(-1)?.replace(" Disk space)", "")},
      {date: new Date(database.updated_at)}
    ]} />)}
  </List>
}

const DATABASE_TYPES: Record<string, string[]> = {
  PostgreSQL: ["17","16","15","14","13","12","11","10","9.6"],
  MySQL: ["9.0", "8.0"],
  MariaDB: ["11.1","11.0","10.11","10.6","10.5","10.4"],
  Redis: ["8.x", "7.x", "6.x", "5.0"],
  Valkey: ["7.2"],
}
const DATABASE_RESOURCE_TYPES: Record<string, [string, string]> = {
  db1: ["(0.25 CPU / 0.25 GB RAM / 1 GB Disk space)", "5 USD / month"],
  db2: ["(0.5 CPU / 2 GB RAM / 5 GB Disk space)", "34 USD / month"],
  db3: ["(1 CPU / 4 GB RAM / 10 GB Disk space)", "65 USD / month"],
  db4: ["(2 CPU / 8 GB RAM / 20 GB Disk space)", "145 USD / month"],
  db5: ["(4 CPU / 16 GB RAM / 40 GB Disk space)", "310 USD / month"],
  db6: ["(8 CPU / 32 GB RAM / 60 GB Disk space)", "800 USD / month"],
  db7: ["(14.5 CPU / 58 GB RAM / 80 GB Disk space)", "1200 USD / month"],
  db8: ["(28.5 CPU / 108.5 GB RAM / 90 GB Disk space)", "1850 USD / month"],
  db9: ["(58.5 CPU / 229 GB RAM / 100 GB Disk space)", "3250 USD / month"],
}
const DATABASE_LOCATIONS = {
  "North America": [
    ["Ashburn, Virginia", "us-east4"],
    ["Council Bluffs, Iowa", "us-central1"],
    ["Las Vegas, Nevada", "us-west4"],
    ["Los Angeles, California", "us-west2"],
    ["Montréal, Québec", "northamerica-northeast1"],
    ["Salt Lake City, Utah", "us-west3"],
    ["South Carolina, USA", "us-east1"],
    ["The Dalles, Oregon", "us-west1"],
  ],
  "South America": [
    ["Osasco, São Paulo", "southamerica-east1"],
    ["Santiago, Chile", "southamerica-west1"],
  ],
  Europe: [
    ["Belgium", "europe-west1"],
    ["Eemshaven, Netherlands", "europe-west4"],
    ["Frankfurt, Germany Europe", "europe-west3"],
    ["Hamina, Finland", "europe-north1"],
    ["London, England", "europe-west2"],
    ["Zurich, Switzerland", "europe-west6"],
  ],
  Asia: [
    ["Changhua County, Taiwan", "asia-east1"],
    ["Delhi, India APAC", "asia-south2"],
    ["Hong Kong, APAC", "asia-east2"],
    ["Jurong West, Singapore", "asia-southeast1"],
    ["Mumbai, India APAC", "asia-south1"],
    ["Osaka, Japan", "asia-northeast2"],
    ["Seoul, South Korea", "asia-northeast3"],
    ["Tokyo, Japan", "asia-northeast1"],
  ],
  Australia: [
    ["Sydney, Australia", "australia-southeast1"],
  ],
}

function CreateDatabase() {
  const {pop} = useNavigation()
  type FormValues = {
    type: string;
    version: string
    db_name:string
    db_user?:string
    db_password:string
    display_name: string;
    location: string;
   resource_type: string;
  }
  const {handleSubmit,itemProps,values}= useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.display_name);
      try {
        await makeRequest<{database: {id: string}}>("databases", {
          method: "POST",
          body: {
            ...values,
            type: values.type.toLowerCase()
          }
        })
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      type: "PostgreSQL",
      resource_type: "db1"
    },
    validation: {
      type: FormValidation.Required,
      version: FormValidation.Required,
      db_name: FormValidation.Required,
      db_user(value) {
       if (values.type!=="Redis" && !value) return "The item is required";
      },
      db_password(value) {
        if (!value) return "The item is required";
        if (value.length<4) return "The item is too short";
      },
      display_name: FormValidation.Required,
      location: FormValidation.Required,
      resource_type: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.Description text="Database Details" />
  <Form.Dropdown title="" {...itemProps.type}>
    {Object.keys(DATABASE_TYPES).map(type => <Form.Dropdown.Item key={type} title={type} value={type} />)}
  </Form.Dropdown>
  <Form.Dropdown title={`${values.type} version`} {...itemProps.version}>
    {Object.values(DATABASE_TYPES[values.type]).map(type => <Form.Dropdown.Item key={type} title={type} value={type} />)}
  </Form.Dropdown>
  <Form.TextField title="Database Name" {...itemProps.db_name} />
  {values.type!=="Redis"&& <Form.TextField title="Database User" {...itemProps.db_user} />}
  <Form.PasswordField title="Database Password" {...itemProps.db_password} />
  <Form.Separator />

  <Form.TextField title="Name" placeholder="my-database" info="Helps you identify your database." {...itemProps.display_name} />
  <Form.Separator />
  <Form.Dropdown title="Location" info="Choose from 25 data center locations, which allows you to place your database in a geographical location closest to your visitors." {...itemProps.location}>
{Object.entries(DATABASE_LOCATIONS).map(([section, vals]) => <Form.Dropdown.Section key={section} title={section}>
  {vals.map(val => <Form.Dropdown.Item key={val[0]} title={`${val[0]} (${val[1]})`} value={val[1]} />)}
</Form.Dropdown.Section>)}
  </Form.Dropdown>
  <Form.Separator />
  <Form.Dropdown title="Resources" info="Resource size cannot be downgraded later on." {...itemProps.resource_type}>
{Object.entries(DATABASE_RESOURCE_TYPES).map(([key, val]) => <Form.Dropdown.Item key={key} title={val[0]} value={key} />)}
  </Form.Dropdown>
  <Form.Description text={DATABASE_RESOURCE_TYPES[values.resource_type][1]} />
  </Form>
}