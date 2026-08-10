```fortran
subroutine ssysv_rk (
        character uplo,
        integer n,
        integer nrhs,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) e,
        integer, dimension( * ) ipiv,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SSYSV_RK computes the solution to a real system of linear
equations A \* X = B, where A is an N-by-N symmetric matrix
and X and B are N-by-NRHS matrices.

The bounded Bunch-Kaufman (rook) diagonal pivoting method is used
to factor A as
A = P\*U\*D\*(U\*\*T)\*(P\*\*T),  if UPLO = 'U', or
A = P\*L\*D\*(L\*\*T)\*(P\*\*T),  if UPLO = 'L',
where U (or L) is unit upper (or lower) triangular matrix,
U\*\*T (or L\*\*T) is the transpose of U (or L), P is a permutation
matrix, P\*\*T is the transpose of P, and D is symmetric and block
diagonal with 1-by-1 and 2-by-2 diagonal blocks.

SSYTRF_RK is called to compute the factorization of a real
symmetric matrix.  The factored form of A is then used to solve
the system of equations A \* X = B by calling BLAS3 routine SSYTRS_3.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored:
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.
> If UPLO = 'U': the leading N-by-N upper triangular part
> of A contains the upper triangular part of the matrix A,
> and the strictly lower triangular part of A is not
> referenced.
> 
> If UPLO = 'L': the leading N-by-N lower triangular part
> of A contains the lower triangular part of the matrix A,
> and the strictly upper triangular part of A is not
> referenced.
> 
> On exit, if INFO = 0, diagonal of the block diagonal
> matrix D and factors U or L  as computed by SSYTRF_RK:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> are stored on exit in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.
> 
> For more info see the description of DSYTRF_RK routine.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

E : REAL array, dimension (N) [out]
> On exit, contains the output computed by the factorization
> routine DSYTRF_RK, i.e. the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i), i=2:N, E(1) is set to 0;
> If UPLO = 'L': E(i) = D(i+1,i), i=1:N-1, E(N) is set to 0.
> 
> NOTE: For 1-by-1 diagonal block D(k), where
> 1 <= k <= N, the element E(k) is set to 0 in both
> UPLO = 'U' or UPLO = 'L' cases.
> 
> For more info see the description of DSYTRF_RK routine.

IPIV : INTEGER array, dimension (N) [out]
> Details of the interchanges and the block structure of D,
> as determined by SSYTRF_RK.
> 
> For more info see the description of DSYTRF_RK routine.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if INFO = 0, the N-by-NRHS solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

WORK : REAL array, dimension ( MAX(1,LWORK) ). [out]
> Work array used in the factorization stage.
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of WORK.  LWORK >= 1. For best performance
> of factorization stage LWORK >= max(1,N\*NB), where NB is
> the optimal blocksize for DSYTRF_RK.
> 
> If LWORK = -1, then a workspace query is assumed;
> the routine only calculates the optimal size of the WORK
> array for factorization stage, returns this value as
> the first entry of the WORK array, and no error message
> related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> 
> < 0: If INFO = -k, the k-th argument had an illegal value
> 
> > 0: If INFO = k, the matrix A is singular, because:
> If UPLO = 'U': column k in the upper
> triangular part of A contains all zeros.
> If UPLO = 'L': column k in the lower
> triangular part of A contains all zeros.
> 
> Therefore D(k,k) is exactly zero, and superdiagonal
> elements of column k of U (or subdiagonal elements of
> column k of L ) are all zeros. The factorization has
> been completed, but the block diagonal matrix D is
> exactly singular, and division by zero will occur if
> it is used to solve a system of equations.
> 
> NOTE: INFO only stores the first occurrence of
> a singularity, any subsequent occurrence of singularity
> is not stored in INFO even though the factorization
> always completes.
