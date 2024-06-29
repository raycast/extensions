import NotificationModel, {EmailProvider} from 'models/Notification';

describe('EmailProvider', () => {
	let provider: EmailProvider;

	beforeEach(() => {
		provider = new EmailProvider();
	});

	it('should get notifications', async () => {
		const notifications = await provider.getNotifications();
		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toMatchObject({
			title: 'New Email from Boss',
			description: 'Subject: Urgent - Project Deadline',
			type: NotificationModel.typeDanger,
			source: NotificationModel.sourceEmail,
		});
		expect(notifications[0].timestamp).toBeInstanceOf(Date);
	});
});
