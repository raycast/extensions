```fortran
subroutine zlags2 (
        logical upper,
        double precision a1,
        complex*16 a2,
        double precision a3,
        double precision b1,
        complex*16 b2,
        double precision b3,
        double precision csu,
        complex*16 snu,
        double precision csv,
        complex*16 snv,
        double precision csq,
        complex*16 snq
)
```

ZLAGS2 computes 2-by-2 unitary matrices U, V and Q, such
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

A1 : DOUBLE PRECISION [in]

A2 : COMPLEX\*16 [in]

A3 : DOUBLE PRECISION [in]
> On entry, A1, A2 and A3 are elements of the input 2-by-2
> upper (lower) triangular matrix A.

B1 : DOUBLE PRECISION [in]

B2 : COMPLEX\*16 [in]

B3 : DOUBLE PRECISION [in]
> On entry, B1, B2 and B3 are elements of the input 2-by-2
> upper (lower) triangular matrix B.

CSU : DOUBLE PRECISION [out]

SNU : COMPLEX\*16 [out]
> The desired unitary matrix U.

CSV : DOUBLE PRECISION [out]

SNV : COMPLEX\*16 [out]
> The desired unitary matrix V.

CSQ : DOUBLE PRECISION [out]

SNQ : COMPLEX\*16 [out]
> The desired unitary matrix Q.
