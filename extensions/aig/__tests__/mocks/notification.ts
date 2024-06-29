import NotificationModel, {NotificationInterface} from 'models/Notification';

export const mockNotifications: NotificationInterface[] = [
	{
		title: 'New Feature Request',
		description:
			'Client XYZ has requested a new dashboard feature for analytics tracking.',
		type: NotificationModel.typeInfo,
		source: NotificationModel.sourceEmail,
		timestamp: new Date(2023, 5, 15, 10, 45),
	},
	{
		title: 'Upcoming Server Maintenance',
		description:
			'Scheduled maintenance for database servers on Saturday, 2:00 AM - 4:00 AM UTC.',
		type: NotificationModel.typeWarning,
		source: NotificationModel.sourceSlack,
		timestamp: new Date(2023, 5, 14, 16, 20),
	},
	{
		title: 'Successful Deployment',
		description:
			'Version 2.3.0 has been successfully deployed to production environment.',
		type: NotificationModel.typeSuccess,
		source: NotificationModel.sourceEmail,
		timestamp: new Date(2023, 5, 14, 9, 15),
	},
	{
		title: 'New Customer Onboarding',
		description: "Customer 'ABC Corp' has completed onboarding. Account is now active.",
		type: NotificationModel.typeSuccess,
		source: NotificationModel.sourceSlack,
		timestamp: new Date(2023, 5, 12, 15, 40),
	},
	{
		title: 'New Offboarding',
		description: 'Customer is out of business. Account is now inactive.',
		type: NotificationModel.typeDanger,
		source: NotificationModel.sourceEmail,
		timestamp: new Date(2023, 5, 12, 15, 40),
	},
];
