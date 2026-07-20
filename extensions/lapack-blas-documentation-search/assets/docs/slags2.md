```fortran
subroutine slags2 (
        logical upper,
        real a1,
        real a2,
        real a3,
        real b1,
        real b2,
        real b3,
        real csu,
        real snu,
        real csv,
        real snv,
        real csq,
        real snq
)
```

SLAGS2 computes 2-by-2 orthogonal matrices U, V and Q, such
that if ( UPPER ) then

U\*\*T \*A\*Q = U\*\*T \*( A1 A2 )\*Q = ( x  0  )
( 0  A3 )     ( x  x  )
and
V\*\*T\*B\*Q = V\*\*T \*( B1 B2 )\*Q = ( x  0  )
( 0  B3 )     ( x  x  )

or if ( .NOT.UPPER ) then

U\*\*T \*A\*Q = U\*\*T \*( A1 0  )\*Q = ( x  x  )
( A2 A3 )     ( 0  x  )
and
V\*\*T\*B\*Q = V\*\*T\*( B1 0  )\*Q = ( x  x  )
( B2 B3 )     ( 0  x  )

The rows of the transformed A and B are parallel, where

U = (  CSU  SNU ), V = (  CSV SNV ), Q = (  CSQ   SNQ )
( -SNU  CSU )      ( -SNV CSV )      ( -SNQ   CSQ )

Z\*\*T denotes the transpose of Z.

## Parameters
UPPER : LOGICAL [in]
> = .TRUE.: the input matrices A and B are upper triangular.
> = .FALSE.: the input matrices A and B are lower triangular.

A1 : REAL [in]

A2 : REAL [in]

A3 : REAL [in]
> On entry, A1, A2 and A3 are elements of the input 2-by-2
> upper (lower) triangular matrix A.

B1 : REAL [in]

B2 : REAL [in]

B3 : REAL [in]
> On entry, B1, B2 and B3 are elements of the input 2-by-2
> upper (lower) triangular matrix B.

CSU : REAL [out]

SNU : REAL [out]
> The desired orthogonal matrix U.

CSV : REAL [out]

SNV : REAL [out]
> The desired orthogonal matrix V.

CSQ : REAL [out]

SNQ : REAL [out]
> The desired orthogonal matrix Q.
