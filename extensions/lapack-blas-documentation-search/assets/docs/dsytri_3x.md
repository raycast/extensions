```fortran
subroutine dsytri_3x (
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) e,
        integer, dimension( * ) ipiv,
        double precision, dimension( n+nb+1, * ) work,
        integer nb,
        integer info
)
```

DSYTRI_3X computes the inverse of a real symmetric indefinite
matrix A using the factorization computed by DSYTRF_RK or DSYTRF_BK:

A = P\*U\*D\*(U\*\*T)\*(P\*\*T) or A = P\*L\*D\*(L\*\*T)\*(P\*\*T),

where U (or L) is unit upper (or lower) triangular matrix,
U\*\*T (or L\*\*T) is the transpose of U (or L), P is a permutation
matrix, P\*\*T is the transpose of P, and D is symmetric and block
diagonal with 1-by-1 and 2-by-2 diagonal blocks.

This is the blocked version of the algorithm, calling Level 3 BLAS.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are
> stored as an upper or lower triangular matrix.
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, diagonal of the block diagonal matrix D and
> factors U or L as computed by DSYTRF_RK and DSYTRF_BK:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> should be provided on entry in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.
> 
> On exit, if INFO = 0, the symmetric inverse of the original
> matrix.
> If UPLO = 'U': the upper triangular part of the inverse
> is formed and the part of A below the diagonal is not
> referenced;
> If UPLO = 'L': the lower triangular part of the inverse
> is formed and the part of A above the diagonal is not
> referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

E : DOUBLE PRECISION array, dimension (N) [in]
> On entry, contains the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i), i=2:N, E(1) not referenced;
> If UPLO = 'L': E(i) = D(i+1,i), i=1:N-1, E(N) not referenced.
> 
> NOTE: For 1-by-1 diagonal block D(k), where
> 1 <= k <= N, the element E(k) is not referenced in both
> UPLO = 'U' or UPLO = 'L' cases.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by DSYTRF_RK or DSYTRF_BK.

WORK : DOUBLE PRECISION array, dimension (N+NB+1,NB+3). [out]

NB : INTEGER [in]
> Block size.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, D(i,i) = 0; the matrix is singular and its
> inverse could not be computed.
