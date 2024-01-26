import { LocalStorage, ActionPanel,popToRoot, Action, Form } from '@raycast/api';
import { Question } from './types';



export default function CreateQuestion (){
    
    function generateQuickGuid() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    
    const onSubmit = async (values: Question) => {
        values.date = new Date;
        values.box = 0;
        values.id = generateQuickGuid()
        await LocalStorage.setItem(values.id, JSON.stringify(values))
        popToRoot();
    }

    return (
        <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={async (values: Question) =>  await onSubmit(values)}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="question" title="Question"  />
        <Form.TextArea id="answer" title="Answer"  />
      </Form>
    )
}
