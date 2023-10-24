import { char, mysqlTable, varchar } from "drizzle-orm/mysql-core";


export const users = mysqlTable('users', {
    id: char('user_id', {
        length: 36,
    }).notNull(),
    email:  varchar('email', {
        length: 255,
    }).notNull(),
})


export type User = typeof users.$inferSelect;