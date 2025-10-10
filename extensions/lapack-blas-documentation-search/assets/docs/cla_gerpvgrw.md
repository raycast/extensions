```fortran
real function cla_gerpvgrw (
        integer n,
        integer ncols,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldaf, * ) af,
        integer ldaf
)
```

CLA_GERPVGRW computes the reciprocal pivot growth factor
norm(A)/norm(U). The  norm is used. If this is
much less than 1, the stability of the LU factorization of the
(equilibrated) matrix A could be poor. This also means that the
solution X, estimated condition numbers, and error bounds could be
unreliable.

## Parameters
N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NCOLS : INTEGER [in]
> The number of columns of the matrix A. NCOLS >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX array, dimension (LDAF,N) [in]
> The factors L and U from the factorization
> A = P\*L\*U as computed by CGETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).
