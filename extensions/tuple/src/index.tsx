import { ActionPanel, CopyToClipboardAction, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle, copyTextToClipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from 'child_process';
import { createHash } from 'crypto';

export default function UserList() {
	const [originalClipboard, setOriginalClipboard] = useState<string>('');
	const [status, setStatus] = useState<string>('booting');
	const [state, setState] = useState<User[]>([]);
	
	useEffect(() => {
		if ('booting' === status) {
			exec('pbpaste', (error, stdout) => {
				if (error) {
					showToast(ToastStyle.Failure, error.message);
					return;
				}
				
				setOriginalClipboard(stdout);
				setStatus('waiting');
			});
		}
		
		if ('waiting' === status) {
			exec('open -g tuple://noop');
			
			let retries = 0;
			const checkTuple = () => {
				exec('open -g tuple://availability-status && pbpaste', (error, stdout) => {
					if (error) {
						showToast(ToastStyle.Failure, error.message);
						return;
					}
					
					if ('tuple-availability: online' === stdout) {
						setStatus('loading');
						return;
					}
					
					if (retries >= 20) {
						showToast(ToastStyle.Failure, 'Unable to start Tuple!');
						return;
					}
					
					retries++;
					setTimeout(checkTuple, 100);
				});
			};
			
			checkTuple();
		}
		
		if ('loading' === status) {
			(async () => {
				exec('open -g "tuple://online-users" && pbpaste', (error, stdout) => {
					if (error) {
						showToast(ToastStyle.Failure, error.message);
						return;
					}
					
					const emails = `${ stdout }`.split(',');
					
					setState(emails.map(email => {
						const hash = createHash('md5')
							.update(email)
							.digest('hex');
						
						const avatar = `https://www.gravatar.com/avatar/${ hash }?d=mp`;
						
						return { email, avatar } as User;
					}));
					
					setStatus('loaded');
					copyTextToClipboard(originalClipboard);
				});
			})();
		}
	}, [status]);
	
	return (
		<List isLoading={ 'loaded' !== status } searchBarPlaceholder="Filter users by email...">
			{ state.map((user) => (
				<UserListItem key={ user.email } user={ user } />
			)) }
		</List>
	);
}

function UserListItem(props: { user: User }) {
	const user = props.user;
	
	return (
		<List.Item
			id={ user.email }
			key={ user.email }
			title={ user.email }
			icon={ {
				source: user.avatar,
				mask: ImageMask.Circle,
			} }
			actions={
				<ActionPanel title={ `Start pairing with ${ user.email }` }>
					<OpenInBrowserAction title="Initiate pairing session" url={ `tuple://drive?email=${ user.email }` } />
					<CopyToClipboardAction title="Copy email address" content={ user.email } />
				</ActionPanel>
			}
		/>
	);
}

type User = {
	email: string;
	avatar: string;
};
