import { showToast, ToastStyle } from '@raycast/api'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'

export const is = ( condition: boolean ): O.Option<null> => condition
	? O.some( null )
	: O.none

export const isError = (err: unknown): err is Error => {
	if ( err instanceof Error ) return true
	return false
}

export const logAndContinue = <T>(data: T): T => {
	console.log(data)
	return data
}

export const toastAndContinue = (style: ToastStyle, title: string, message?: string) => <T>(data: T): T => {
	showToast(style, title, message)
	return data
}

export const parseJson = <T>( json: string ): E.Either<Error, T> => {
	try {
		return E.right( JSON.parse( json ) )
	} catch ( error ) {
		return E.left( E.toError( error ) )
	}
}
