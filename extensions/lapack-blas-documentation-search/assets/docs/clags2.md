```fortran
subroutine clags2 (
        logical upper,
        real a1,
        complex a2,
        real a3,
        real b1,
        complex b2,
        real b3,
        real csu,
        complex snu,
        real csv,
        complex snv,
        real csq,
        complex snq
)
```

CLAGS2 computes 2-by-2 unitary matrices U, V and Q, such
that if ( UPPER ) then

U\*\*H \*A\*Q = U\*\*H \*( A1 A2 )\*Q = ( x  0  )
( 0  A3 )     ( x  x  )
and
V\*\*H\*B\*Q = V\*\*H \*( B1 B2 )\*Q = ( x  0  )
( 0  B3 )     ( x  x  )

or if ( .NOT.UPPER ) then

U\*\*H \*A\*Q = U\*\*H \*( A1 0  )\*Q = ( x  x  )
( A2 A3 )     ( 0  x  )
and
V\*\*H \*B\*Q = V\*\*H \*( B1 0  )\*Q = ( x  x  )
( B2 B3 )     ( 0  x  )
where

U = (   CSU    SNU ), V = (  CSV    SNV ),
( -SNU\*\*H  CSU )      ( -SNV\*\*H CSV )

Q = (   CSQ    SNQ )
( -SNQ\*\*H  CSQ )

The rows of the transformed A and B are parallel. Moreover, if the
input 2-by-2 matrix A is not zero, then the transformed (1,1) entry
of A is not zero. If the input matrices A and B are both not zero,
then the transformed (2,2) element of B is not zero, except when the
first rows of input A and B are parallel and the second rows are
zero.

## Parameters
UPPER : LOGICAL [in]
> = .TRUE.: the input matrices A and B are upper triangular.
> = .FALSE.: the input matrices A and B are lower triangular.

A1 : REAL [in]

A2 : COMPLEX [in]

A3 : REAL [in]
> On entry, A1, A2 and A3 are elements of the input 2-by-2
> upper (lower) triangular matrix A.

B1 : REAL [in]

B2 : COMPLEX [in]

B3 : REAL [in]
> On entry, B1, B2 and B3 are elements of the input 2-by-2
> upper (lower) triangular matrix B.

CSU : REAL [out]

SNU : COMPLEX [out]
> The desired unitary matrix U.

CSV : REAL [out]

SNV : COMPLEX [out]
> The desired unitary matrix V.

CSQ : REAL [out]

SNQ : COMPLEX [out]
> The desired unitary matrix Q.
