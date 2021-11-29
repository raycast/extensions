import { ActionPanel, SubmitFormAction, Form,
         getLocalStorageItem, setLocalStorageItem, getPreferenceValues,
         showToast, ToastStyle  } from '@raycast/api';
import { existsSync }             from 'fs';
import { useEffect, useState }    from "react";

interface FormValues {
    config?: string;
}

interface Preferences {
    path: string;
}

export default function Command() {

    const preferences: Preferences = getPreferenceValues();
    const [ state, setState ]      = useState<FormValues>({ config: preferences.path });
    const [ checked, setChecked ]  = useState( false );

    useEffect(() => {
        async function fetchStories() {
            try {
                const checked = await getLocalStorageItem( 'simpread_config_local' );
                setChecked( checked == 1 );
                setState({ config: await getLocalStorageItem( 'simpread_config_path' ) });
            } catch ( error ) {
                setState({ config: '' });
                setChecked( false );
            }
        }
        fetchStories();
    }, []);

    function handleSubmit( values: FormValues ) {
        if ( !values.config || values.config == '' ) {
            showToast( ToastStyle.Failure, '请输入 simpread_config.json 有效地址。' );
        } else if ( !values.config.endsWith( 'simpread_config.json' )) {
            showToast( ToastStyle.Failure, '请输入包括 simpread_config.json 的地址。' );
        } else if ( !existsSync( values.config )) {
            showToast( ToastStyle.Failure, '输入的地址不存在 simpread_config.json。' );
        } else {
            setLocalStorageItem( 'simpread_config_path', values.config );
            setLocalStorageItem( 'simpread_config_local', checked );
            showToast( ToastStyle.Success, '设置成功' );
        }
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <SubmitFormAction title="Submit" onSubmit={ handleSubmit } />
                </ActionPanel>
            }
        >
            <Form.TextField id="config" title="请输入简悦的 simpread_config.json 地址" placeholder="包含 simpread_config.json 的路径" value={ state.config } />
        </Form>
  );
}
