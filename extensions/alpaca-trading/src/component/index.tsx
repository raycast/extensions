import { Action, ActionPanel, Color, Form, Icon } from '@raycast/api';

import { AlpacaHook } from '@/hook';

export namespace AlpacaNode {
  export namespace Positions {
    export const ClosePositionForm = (props: AlpacaHook.Positions.UseClosePositionFormProps) => {
      const { position } = props;
      const { handleSubmit, itemProps, values } = AlpacaHook.Positions.useClosePositionForm(props);
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
    };
  }
}
