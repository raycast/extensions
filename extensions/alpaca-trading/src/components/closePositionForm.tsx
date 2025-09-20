import { closePosition, Position } from '@api/positions';
import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon } from '@raycast/api';
import { FormValidation, useForm } from '@raycast/utils';

export interface ClosePositionFormValues {
  quantity: string;
  percentage: string;
  kind: string;
}

export interface UseClosePositionFormProps {
  position: Position;
  revalidate: () => void;
  pop: () => void;
}

export function ClosePositionForm({ position, revalidate, pop }: UseClosePositionFormProps) {
  const { handleSubmit, itemProps, values } = useForm<ClosePositionFormValues>({
    onSubmit: val =>
      confirmAlert({
        title: 'Are you sure?',
        message: {
          all: `Closing entire ${position.qty_available} quantities for ${position.symbol} position`,
          qty: `Closing ${val.quantity} quantities for ${position.symbol} position`,
          pc: `Closing ${val.percentage} % for ${position.symbol} position`,
        }[val.kind],
        icon: { source: Icon.TackDisabled, tintColor: Color.Red },
        primaryAction: {
          title: 'Yes',
          style: Alert.ActionStyle.Destructive,
          onAction: () =>
            closePosition(position, { qty: `?qty=${val.quantity}`, pc: `?percentage=${val.percentage}` }[val.kind]).finally(() => {
              pop();
              setTimeout(revalidate, 1000);
            }),
        },
        dismissAction: { title: 'No', style: Alert.ActionStyle.Cancel },
      }),
    initialValues: { kind: 'all' },
    validation: {
      kind: FormValidation.Required,
      quantity: value => {
        if (values.kind === 'qty') {
          if (!value || value.length === 0 || Number.isNaN(Number(value)) || Number(value) < 0 || value!.split('.')[1]?.length > 9) {
            return 'quantity should be a positive number with at most 9 decimal places';
          }
        }
      },
      percentage: value => {
        if (values.kind === 'pc') {
          if (!value || value.length === 0 || Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100 || value!.split('.')[1]?.length > 9) {
            return 'percentage should be a number between 0 to 100 with at most 9 decimal places';
          }
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={`Close ${position.symbol} Positions`}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Note" text={`❗You will be releasing some quantities for your ${position.symbol} position. Proceed with caution!`} />
      <Form.Description title="Symbol" text={position.symbol} />
      <Form.Description title="Asset ID" text={position.asset_id} />
      <Form.Description title="Quantity Available" text={position.qty_available} />
      <Form.Separator />
      <Form.Dropdown {...itemProps.kind} title="Close Positions..." info="Specify how you want to close positions">
        <Form.Dropdown.Item title="All" value="all" icon={{ source: Icon.TackDisabled, tintColor: Color.Red }} />
        <Form.Dropdown.Item title="Specific Quantity" value="qty" icon={{ source: Icon.TackDisabled, tintColor: Color.Red }} />
        <Form.Dropdown.Item title="Specific Percentage" value="pc" icon={{ source: Icon.TackDisabled, tintColor: Color.Red }} />
      </Form.Dropdown>
      {values.kind === 'qty' && (
        <Form.TextField {...itemProps.quantity} placeholder="1.2345.." info="The number of shares to liquidate. Can accept up to 9 decimal points." title="Quantity" />
      )}
      {values.kind === 'pc' && (
        <Form.TextField
          {...itemProps.percentage}
          placeholder="7.2578.."
          info="Percentage of position to liquidate. Must be between 0 and 100. Would only sell fractional if position is originally fractional. Can accept up to 9 decimal points."
          title="Percentage"
        />
      )}
    </Form>
  );
}
