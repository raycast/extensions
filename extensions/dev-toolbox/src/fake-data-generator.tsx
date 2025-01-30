import { Form, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { faker } from "@faker-js/faker";
import { generate } from "generate-password-ts";
import { loremIpsum } from "lorem-ipsum";

type DataType = "name" | "email" | "phone" | "address" | "date" | "lorem" | "uuid" | "password";
type NameType = "full" | "first" | "last";
type AddressFormat = "street" | "city" | "state" | "zip" | "country";
type DateFormat = "YYYY-MM-DD" | "MM-DD-YYYY" | "DD-MM-YYYY" | "full" | "time" | "day" | "month" | "year";
type LoremUnits = "words" | "sentences" | "paragraphs";
type NumberType = "human" | "national" | "international";

export default function FakeDataGenerator() {
  const [output, setOutput] = useState("");
  const [dataType, setDataType] = useState<DataType>("name");
  const [nameType, setNameType] = useState<NameType>("full");
  const [addressFields, setAddressFields] = useState<AddressFormat[]>(["street", "city", "state", "zip", "country"]);
  const [count, setCount] = useState("3");
  const [passwordLength, setPasswordLength] = useState("12");
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [dateFormat, setDateFormat] = useState<DateFormat>("YYYY-MM-DD");
  const [loremUnits, setLoremUnits] = useState<LoremUnits>("paragraphs");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [numberType, setNumberType] = useState<NumberType>("international");

  const generateData = () => {
    try {
      const countNum = Math.max(1, parseInt(count) || 1);
      let generatedData: string[] = [];

      for (let i = 0; i < countNum; i++) {
        switch (dataType) {
          case "name": {
            generatedData.push(
              nameType === "full"
                ? faker.person.fullName()
                : nameType === "first"
                  ? faker.person.firstName()
                  : faker.person.lastName(),
            );
            break;
          }
          case "email": {
            generatedData.push(faker.internet.email());
            break;
          }
          case "phone": {
            generatedData.push(faker.phone.number({ style: numberType }));
            break;
          }
          case "address": {
            const addressParts = [];
            if (addressFields.includes("street")) addressParts.push(faker.location.streetAddress());
            if (addressFields.includes("city")) addressParts.push(faker.location.city());
            if (addressFields.includes("state")) addressParts.push(faker.location.state());
            if (addressFields.includes("zip")) addressParts.push(faker.location.zipCode());
            if (addressFields.includes("country")) addressParts.push(faker.location.country());
            generatedData.push(addressParts.join(", "));
            break;
          }
          case "date": {
            const date =
              startDate && endDate
                ? faker.date.between({ from: new Date(startDate), to: new Date(endDate) })
                : faker.date.anytime();
            let formattedDate;
            switch (dateFormat) {
              case "YYYY-MM-DD":
                formattedDate = date.toISOString().split("T")[0];
                break;
              case "MM-DD-YYYY":
                formattedDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
                break;
              case "DD-MM-YYYY":
                formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
                break;
              case "full":
                formattedDate = date.toLocaleString();
                break;
              case "time":
                formattedDate = date.toLocaleTimeString();
                break;
              case "day":
                formattedDate = date.toLocaleDateString(undefined, { weekday: "long" });
                break;
              case "month":
                formattedDate = date.toLocaleDateString(undefined, { month: "long" });
                break;
              case "year":
                formattedDate = date.getFullYear().toString();
                break;
            }
            generatedData.push(formattedDate);
            break;
          }
          case "lorem": {
            const loremCount = parseInt(count);
            generatedData = [
              String(
                loremIpsum({
                  count: loremCount,
                  units: loremUnits,
                  format: "plain",
                }),
              ),
            ];
            break;
          }
          case "password": {
            generatedData.push(
              generate({
                length: parseInt(passwordLength || "12"),
                uppercase: includeUppercase,
                numbers: includeNumbers,
                symbols: includeSymbols,
                excludeSimilarCharacters: true,
              }),
            );
            break;
          }
        }
      }

      const outputText: string = generatedData.join("\n");
      setOutput(outputText);
      Clipboard.copy(outputText);
      showToast({ style: Toast.Style.Success, title: `Copied ${generatedData.length} items!` });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error generating data", message: String(error) });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate & Copy" onSubmit={generateData} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="dataType" title="Data Type" value={dataType} onChange={(val) => setDataType(val as DataType)}>
        <Form.Dropdown.Item value="name" title="Name" />
        <Form.Dropdown.Item value="email" title="Email" />
        <Form.Dropdown.Item value="phone" title="Phone" />
        <Form.Dropdown.Item value="address" title="Address" />
        <Form.Dropdown.Item value="date" title="Date" />
        <Form.Dropdown.Item value="lorem" title="Lorem Ipsum" />
        <Form.Dropdown.Item value="password" title="Password" />
      </Form.Dropdown>

      {dataType === "name" && (
        <Form.Dropdown
          id="nameType"
          title="Name Format"
          value={nameType}
          onChange={(val) => setNameType(val as NameType)}
        >
          <Form.Dropdown.Item value="full" title="Full Name" />
          <Form.Dropdown.Item value="first" title="First Name" />
          <Form.Dropdown.Item value="last" title="Last Name" />
        </Form.Dropdown>
      )}

      {dataType === "address" && (
        <Form.TagPicker
          id="addressFields"
          title="Address Components"
          value={addressFields}
          onChange={(val) => setAddressFields(val as AddressFormat[])}
        >
          <Form.TagPicker.Item value="street" title="Street" />
          <Form.TagPicker.Item value="city" title="City" />
          <Form.TagPicker.Item value="state" title="State" />
          <Form.TagPicker.Item value="zip" title="ZIP Code" />
          <Form.TagPicker.Item value="country" title="Country" />
        </Form.TagPicker>
      )}

      {dataType === "date" && (
        <>
          <Form.Dropdown
            id="dateFormat"
            title="Date Format"
            value={dateFormat}
            onChange={(val) => setDateFormat(val as DateFormat)}
          >
            <Form.Dropdown.Item value="YYYY-MM-DD" title="YYYY-MM-DD" />
            <Form.Dropdown.Item value="MM-DD-YYYY" title="MM-DD-YYYY" />
            <Form.Dropdown.Item value="DD-MM-YYYY" title="DD-MM-YYYY" />
            <Form.Dropdown.Item value="full" title="Full Date & Time" />
            <Form.Dropdown.Item value="time" title="Time Only" />
            <Form.Dropdown.Item value="day" title="Day of the Week" />
            <Form.Dropdown.Item value="month" title="Month" />
            <Form.Dropdown.Item value="year" title="Year" />
          </Form.Dropdown>

          <Form.TextField id="startDate" title="Start Date" value={startDate} onChange={(val) => setStartDate(val)} />
          <Form.TextField id="endDate" title="End Date" value={endDate} onChange={(val) => setEndDate(val)} />
        </>
      )}

      {dataType === "phone" && (
        <Form.Dropdown
          id="numberType"
          title="Phone Number Type"
          value={numberType}
          onChange={(val) => setNumberType(val as NumberType)}
        >
          <Form.Dropdown.Item value="human" title="Human Input" />
          <Form.Dropdown.Item value="national" title="National Format" />
          <Form.Dropdown.Item value="international" title="International Format (E.123)" />
        </Form.Dropdown>
      )}

      {dataType === "lorem" && (
        <Form.Dropdown
          id="loremUnits"
          title="Lorem Ipsum Unit"
          value={loremUnits}
          onChange={(val) => setLoremUnits(val as LoremUnits)}
        >
          <Form.Dropdown.Item value="words" title="Words" />
          <Form.Dropdown.Item value="sentences" title="Sentences" />
          <Form.Dropdown.Item value="paragraphs" title="Paragraphs" />
        </Form.Dropdown>
      )}

      {dataType === "password" && (
        <>
          <Form.TextField
            id="passwordLength"
            title="Password Length"
            value={passwordLength}
            onChange={(val) => setPasswordLength(val.replace(/\D/g, ""))}
          />
          <Form.Checkbox
            id="uppercase"
            label="Include Uppercase"
            value={includeUppercase}
            onChange={setIncludeUppercase}
          />
          <Form.Checkbox id="numbers" label="Include Numbers" value={includeNumbers} onChange={setIncludeNumbers} />
          <Form.Checkbox id="symbols" label="Include Symbols" value={includeSymbols} onChange={setIncludeSymbols} />
        </>
      )}

      <Form.TextField id="count" title="Count" value={count} onChange={(val) => setCount(val.replace(/\D/g, ""))} />

      {output && <Form.Description title="Generated Data" text={output} />}
    </Form>
  );
}
