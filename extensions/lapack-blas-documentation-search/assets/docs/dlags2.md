```fortran
subroutine dlags2 (
        logical upper,
        double precision a1,
        double precision a2,
        double precision a3,
        double precision b1,
        double precision b2,
        double precision b3,
        double precision csu,
        double precision snu,
        double precision csv,
        double precision snv,
        double precision csq,
        double precision snq
)
```

DLAGS2 computes 2-by-2 orthogonal matrices U, V and Q, such
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

A1 : DOUBLE PRECISION [in]

A2 : DOUBLE PRECISION [in]

A3 : DOUBLE PRECISION [in]
> On entry, A1, A2 and A3 are elements of the input 2-by-2
> upper (lower) triangular matrix A.

B1 : DOUBLE PRECISION [in]

B2 : DOUBLE PRECISION [in]

B3 : DOUBLE PRECISION [in]
> On entry, B1, B2 and B3 are elements of the input 2-by-2
> upper (lower) triangular matrix B.

CSU : DOUBLE PRECISION [out]

SNU : DOUBLE PRECISION [out]
> The desired orthogonal matrix U.

CSV : DOUBLE PRECISION [out]

SNV : DOUBLE PRECISION [out]
> The desired orthogonal matrix V.

CSQ : DOUBLE PRECISION [out]

SNQ : DOUBLE PRECISION [out]
> The desired orthogonal matrix Q.
