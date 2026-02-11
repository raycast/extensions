```fortran
double precision function zla_herpvgrw (
        character*1 uplo,
        integer n,
        integer info,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        double precision, dimension( * ) work
)
```

ZLA_HERPVGRW computes the reciprocal pivot growth factor
norm(A)/norm(U). The  norm is used. If this is
much less than 1, the stability of the LU factorization of the
(equilibrated) matrix A could be poor. This also means that the
solution X, estimated condition numbers, and error bounds could be
unreliable.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

INFO : INTEGER [in]
> The value of INFO returned from ZHETRF, .i.e., the pivot in
> column INFO is exactly 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX\*16 array, dimension (LDAF,N) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by ZHETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by ZHETRF.

WORK : DOUBLE PRECISION array, dimension (2\*N) [out]
