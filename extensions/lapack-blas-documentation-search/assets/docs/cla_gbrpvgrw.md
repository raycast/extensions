```fortran
real function cla_gbrpvgrw (
        integer n,
        integer kl,
        integer ku,
        integer ncols,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        complex, dimension( ldafb, * ) afb,
        integer ldafb
)
```

CLA_GBRPVGRW computes the reciprocal pivot growth factor
norm(A)/norm(U). The  norm is used. If this is
much less than 1, the stability of the LU factorization of the
(equilibrated) matrix A could be poor. This also means that the
solution X, estimated condition numbers, and error bounds could be
unreliable.

## Parameters
N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

NCOLS : INTEGER [in]
> The number of columns of the matrix A.  NCOLS >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> On entry, the matrix A in band storage, in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(KU+1+i-j,j) = A(i,j) for max(1,j-KU)<=i<=min(N,j+kl)

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

AFB : COMPLEX array, dimension (LDAFB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by CGBTRF.  U is stored as an upper triangular
> band matrix with KL+KU superdiagonals in rows 1 to KL+KU+1,
> and the multipliers used during the factorization are stored
> in rows KL+KU+2 to 2\*KL+KU+1.

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= 2\*KL+KU+1.
