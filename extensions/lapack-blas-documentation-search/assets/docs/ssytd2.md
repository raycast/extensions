```fortran
subroutine ssytd2 (
        character uplo,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( * ) tau,
        integer info
)
```

SSYTD2 reduces a real symmetric matrix A to symmetric tridiagonal
form T by an orthogonal similarity transformation: Q\*\*T \* A \* Q = T.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored:
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> n-by-n upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading n-by-n lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> On exit, if UPLO = 'U', the diagonal and first superdiagonal
> of A are overwritten by the corresponding elements of the
> tridiagonal matrix T, and the elements above the first
> superdiagonal, with the array TAU, represent the orthogonal
> matrix Q as a product of elementary reflectors; if UPLO
> = 'L', the diagonal and first subdiagonal of A are over-
> written by the corresponding elements of the tridiagonal
> matrix T, and the elements below the first subdiagonal, with
> the array TAU, represent the orthogonal matrix Q as a product
> of elementary reflectors. See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

D : REAL array, dimension (N) [out]
> The diagonal elements of the tridiagonal matrix T:
> D(i) = A(i,i).

E : REAL array, dimension (N-1) [out]
> The off-diagonal elements of the tridiagonal matrix T:
> E(i) = A(i,i+1) if UPLO = 'U', E(i) = A(i+1,i) if UPLO = 'L'.

TAU : REAL array, dimension (N-1) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
