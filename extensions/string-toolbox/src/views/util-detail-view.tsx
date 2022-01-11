import { useState } from "react";
import { useNavigation, showToast, ActionPanel, SubmitFormAction, ToastStyle, Form } from "@raycast/api";
import { TransformError } from "../errors";
import { Util } from "../interfaces";
import UtilResultView from "./util-result-view";

interface UtilDetailViewProps {
  util: Util;
}

const UtilDetailView = ({ util }: UtilDetailViewProps) => {
  const { push } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async ({ value }: { value: string }) => {
    if (!value.trim()) {
      return showToast(ToastStyle.Failure, "Nothing to convert", "It looks like you didn't input anything?");
    }
    if (submitting) {
      return showToast(ToastStyle.Failure, "Please wait…", "Script is still executing…");
    }
    try {
      setSubmitting(true);
      const transformed = await util.transform(value.trim());
      setSubmitting(false);
      push(<UtilResultView input={value} output={transformed} />);
    } catch (e: unknown) {
      if (e instanceof TransformError) {
        await showToast(ToastStyle.Failure, "Error", e.message);
      }
    }
  };

  const actions = (
    <ActionPanel>
      <SubmitFormAction title="Convert" onSubmit={onSubmit} />
    </ActionPanel>
  );

  const inputId = "value";
  const inputTitle = "From";
  const inputPlaceholder = "Paste the text you want to transform here";

  return (
    <Form navigationTitle={util.name} actions={actions} isLoading={submitting}>
      {(() => {
        switch (util.inputType) {
          case "textarea": {
            return <Form.TextArea id={inputId} title={inputTitle} placeholder={inputPlaceholder} />;
          }
          case "textfield": {
            return <Form.TextField id={inputId} title={inputTitle} placeholder={inputPlaceholder} />;
          }
        }
      })()}
    </Form>
  );
};

export default UtilDetailView;
