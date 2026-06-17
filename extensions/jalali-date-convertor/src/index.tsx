import { useState, useRef } from "react";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import convertor from "./convertor";
import ResultView from "./ResultView";
import moment from "jalali-moment";

const todayDate = moment();

export default function Command() {
  const { push } = useNavigation();
  const [convertMode, setConvertMode] = useState<"jalaliToGregorian" | "gregorianToJalali">("jalaliToGregorian");

  const onSubmit = (values: any) => {
    const result = convertor({ convertMode, values });
    if (typeof result === "string") {
      push(<ResultView result={result} />);
    }
  };

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={onSubmit} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="convertType" title="Convert Type" value={convertMode} onChange={setConvertMode as any}>
          <Form.Dropdown.Item value="jalaliToGregorian" title="Shamsi To Miladi" icon="📅" />
          <Form.Dropdown.Item value="gregorianToJalali" title="Miladi To Shamsi" icon="📅" />
        </Form.Dropdown>
        {convertMode === "jalaliToGregorian" && (
          <>
            <Form.Dropdown id="jalaliYear" title="Jalali Year" defaultValue={"" + todayDate.jYear()}>
              {[...Array(100).keys()].map((i) => (
                <Form.Dropdown.Item key={i} value={"" + (i + 1350)} title={"" + (i + 1350)} />
              ))}
            </Form.Dropdown>
            <Form.Dropdown id="jalaliMonth" title="Jalali Month" defaultValue={"" + (todayDate.jMonth() + 1)}>
              {[...Array(12).keys()].map((i) => (
                <Form.Dropdown.Item key={i} value={"" + (i + 1)} title={"" + (i + 1)} />
              ))}
            </Form.Dropdown>
            <Form.Dropdown id="jalaliDay" title="Jalali Day" defaultValue={"" + todayDate.jDate()}>
              {[...Array(31).keys()].map((i) => (
                <Form.Dropdown.Item key={i} value={"" + (i + 1)} title={"" + (i + 1)} />
              ))}
            </Form.Dropdown>
          </>
        )}
        {convertMode === "gregorianToJalali" && (
          <>
            <Form.Dropdown id="gregorianYear" title="Gregorian Year" defaultValue={"" + todayDate.year()}>
              {[...Array(100).keys()].map((i) => (
                <Form.Dropdown.Item key={i} value={"" + (i + 1980)} title={"" + (i + 1980)} />
              ))}
            </Form.Dropdown>
            <Form.Dropdown id="gregorianMonth" title="Gregorian Month" defaultValue={"" + (todayDate.month() + 1)}>
              {[...Array(12).keys()].map((i) => (
                <Form.Dropdown.Item key={i} value={"" + (i + 1)} title={"" + (i + 1)} />
              ))}
            </Form.Dropdown>
            <Form.Dropdown id="gregorianDay" title="Gregorian Day" defaultValue={"" + todayDate.date()}>
              {[...Array(31).keys()].map((i) => (
                <Form.Dropdown.Item key={i} value={"" + (i + 1)} title={"" + (i + 1)} />
              ))}
            </Form.Dropdown>
          </>
        )}
        <Form.Separator />
      </Form>
    </>
  );
}
