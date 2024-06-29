import NotificationModel, {SlackProvider} from 'models/Notification';

describe('SlackProvider', () => {
	let provider: SlackProvider;

	beforeEach(() => {
		provider = new SlackProvider();
	});

	it('should get notifications', async () => {
		const notifications = await provider.getNotifications();
		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toMatchObject({
			title: 'New Slack from Boss',
			description: 'Subject: Urgent - Project Deadline',
			type: NotificationModel.typeDanger,
			source: NotificationModel.sourceSlack,
		});
		expect(notifications[0].timestamp).toBeInstanceOf(Date);
	});
});
