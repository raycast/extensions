import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, Detail, Icon } from '@raycast/api';

interface Props {
  title: string;
  correctValue: number;
  emptyValue: number;
}
interface Values {
  c: string;
  e: string;
}

const GenericCalculator = (props: Props) => {
  const handleSubmit = (values: Values) => {
    if (typeof values.c !== 'string' || (props.emptyValue !== 0 && typeof values.e !== 'string')) {
      showToast(ToastStyle.Failure, 'Bad Request', "Fields aren't strings");
      return;
    }

    const c = parseInt(values.c);
    const e = props.emptyValue !== 0 ? parseInt(values.e) : 0;

    if (isNaN(c) || isNaN(e)) {
      showToast(ToastStyle.Failure, 'Bad Request', 'Enter numbers, please...');
      return;
    }

    const score = c * props.correctValue + e * props.emptyValue;

    showToast(ToastStyle.Success, `Your score is ${score}`, 'Good job!');
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Get Score" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextField id="c" title="Correct" placeholder="Number of correct answers" />
      {props.emptyValue !== 0 && <Form.TextField id="e" title="Empty" placeholder="Number of questions left empty" />}
    </Form>
  );
};

export default GenericCalculator;
